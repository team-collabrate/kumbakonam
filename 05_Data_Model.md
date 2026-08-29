# Data Model
## Kumbakonam Cafe POS System (Firestore)

### 1. Collections Overview
```
users/{userId}
menu/{itemId}
orders/{orderId}
  └── items: [ { itemId, name, price, qty, note } ]  (embedded array, not subcollection)
```

### 2. `users` Collection
Stores login PINs (hashed) and roles.

| Field | Type | Description |
|---|---|---|
| `userId` (doc id) | string | Auto-generated |
| `name` | string | e.g. "Ravi (Worker)", "Owner 1" |
| `role` | string enum | `worker` \| `owner` |
| `pinHash` | string | SHA-256 hash of 4-digit PIN |
| `createdAt` | timestamp | |
| `active` | boolean | Allows disabling a user without deleting |

### 3. `menu` Collection
| Field | Type | Description |
|---|---|---|
| `itemId` (doc id) | string | Auto-generated |
| `name` | string | Canonical English/Tanglish name, e.g. "Filter Coffee". Used for orders, receipts, and ESC/POS printing (most thermal printers can't render Tamil glyphs). |
| `nameTa` | string, optional | Tamil-script display name, e.g. "பில்டர் காபி". Shown on-screen (Worker menu grid, Owner menu list) when the app language is set to Tamil; falls back to `name` if unset. |
| `price` | number | In ₹, e.g. 40 |
| `category` | string | Optional grouping label, e.g. "Hot Drinks". Category *labels* are translated in the UI via a small lookup table, not stored bilingually. |
| `active` | boolean | Toggle item availability without deleting |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | Last edited by owner |

### 4. `orders` Collection
| Field | Type | Description |
|---|---|---|
| `orderId` (doc id) | string | Auto-generated |
| `items` | array of objects | See below |
| `subtotal` | number | Sum before discount |
| `discount` | number | Flat ₹ amount. Always 0 from 2026-08-29 — the cafe gives no discounts and the till no longer offers one. Retained because earlier orders carry real values. |
| `total` | number | subtotal - discount |
| `paymentMethod` | string enum | `cash` \| `upi` \| `split`. `card` is legacy: no longer selectable, but present on orders taken before the change, so readers must still handle it. |
| `cashAmount` | number, optional | Cash half of a `split` bill. Absent otherwise. |
| `upiAmount` | number, optional | GPay/UPI half of a `split` bill. Absent otherwise. |
| `workerId` | string | Reference to `users` doc who created it |
| `createdAt` | timestamp | Server timestamp |
| `syncedAt` | timestamp \| null | Set when confirmed written (useful for offline queue visibility) |
| `status` | string enum | `completed` (v1 only has this; extensible later) |

**`items` array item shape:**
```json
{
  "itemId": "abc123",
  "name": "Filter Coffee",
  "price": 40,
  "qty": 2,
  "note": "less sugar"
}
```
> Item name/price are duplicated (denormalized) into the order at time of sale, so later menu price edits don't retroactively change historical order totals.

### 5. Relationships
- `orders.workerId` → `users.userId` (which staff member created the order)
- `orders.items[].itemId` → `menu.itemId` (denormalized copy; not a live reference)

### 6. Aggregation Approach (v1)
No separate "daily summary" collection for v1 — owner app computes today/week/month totals client-side by querying `orders` within a date range (`createdAt >= startOfDay` etc.) and reducing in-memory. Acceptable at this scale (single cafe, low order volume). Can be revisited with scheduled Cloud Functions if volume grows.

### 7. Firestore Security Rules (Summary)
- `menu`: read → any authenticated session; write → `role == owner` only.
- `orders`: read → any authenticated session; create → `role == worker` or `owner`; update/delete → `role == owner` only (e.g. correcting a mistake).
- `users`: no direct client read/write of `pinHash` field exposed to app logic beyond initial auth check (handled via a controlled query, e.g. a Cloud Function or restricted read pattern) — to be finalized in engineering phase for hardened PIN validation.
