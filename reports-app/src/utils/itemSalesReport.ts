import { businessDayKey, businessDayStart, translateItemName, type Language, type Order } from "@kumbakonam/shared";

export interface ItemSalesLine {
  itemId: string;
  name: string;
  qty: number;
  amount: number;
  /** amount / qty — shown as its own column specifically so two lines that
   *  share a display name (e.g. a menu item renamed/re-added with a new
   *  price, or a bulk/wholesale rate billed under the same name) read as
   *  two genuinely different sales rather than a duplicate-looking glitch.
   *  Requested 2026-09-03 after exactly that: two "Vadai" rows on the same
   *  day, one retail (₹10) and one a bulk credit order billed at ₹8 under
   *  a since-deleted menu-item id. */
  rate: number;
  /** True if this itemId itself was sold at more than one price within the
   *  window — `rate` is then an average, not "the" price, and callers
   *  should say so rather than implying a single fixed rate. */
  rateVaries: boolean;
}

export interface DaySalesReport {
  /** businessDayKey — YYYY-MM-DD */
  key: string;
  label: string;
  totalSales: number;
  orderCount: number;
  items: ItemSalesLine[];
}

/** businessDayStart of `daysAgo` business days before `now` — 0 is today's
 *  own business day. Mirrors the cutoff math archiveAndPruneOldData uses,
 *  so "last N days" here means the same thing it means there. */
export function nthBusinessDayStart(now: Date, daysAgo: number): Date {
  const start = businessDayStart(now);
  start.setDate(start.getDate() - daysAgo);
  return start;
}

/** Always the real calendar date, e.g. "03 Sep" — (Today)/(Yesterday) only
 *  ever a bracketed suffix on top of that, never a replacement for it, so
 *  the label answers "which date" on its own even without the relative
 *  hint (requested 2026-09-03: "add real date and with bracket (today)
 *  (yesterday)"). */
function dayLabel(key: string, language: Language): string {
  const [y, m, d] = key.split("-").map(Number);
  // Reconstruct a real Date at the business day's own 3am start so
  // weekday/month come out right regardless of the viewer's timezone quirks.
  const date = new Date(y, m - 1, d, 3, 0, 0);
  const dateText = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const todayKey = businessDayKey(new Date());
  const yesterdayKey = businessDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (key === todayKey) return `${dateText} (${language === "ta" ? "இன்று" : "Today"})`;
  if (key === yesterdayKey) return `${dateText} (${language === "ta" ? "நேற்று" : "Yesterday"})`;
  return dateText;
}

/** Groups non-voided orders by business day and, within each day, by item —
 *  the "what sold, how many, for how much" breakdown a totals-only number
 *  can't answer. Days newest-first, items within a day by amount desc (the
 *  biggest sellers first, matching what an owner scanning this actually
 *  wants to see first). */
export function buildItemSalesReport(orders: Order[], language: Language): DaySalesReport[] {
  const byDay = new Map<
    string,
    { totalSales: number; orderCount: number; items: Map<string, ItemSalesLine & { pricesSeen: Set<number> }> }
  >();

  for (const order of orders) {
    if (order.status === "voided") continue;
    const key = businessDayKey(order.createdAt.toDate());
    let day = byDay.get(key);
    if (!day) {
      day = { totalSales: 0, orderCount: 0, items: new Map() };
      byDay.set(key, day);
    }
    day.totalSales += order.total;
    day.orderCount += 1;
    for (const item of order.items) {
      // Same item can carry slightly different casing/spacing across old
      // orders — itemId is the stable key; name is only for display.
      const existing = day.items.get(item.itemId);
      const amount = item.price * item.qty;
      if (existing) {
        existing.qty += item.qty;
        existing.amount += amount;
        existing.pricesSeen.add(item.price);
      } else {
        day.items.set(item.itemId, {
          itemId: item.itemId,
          name: translateItemName(item, language),
          qty: item.qty,
          amount,
          rate: 0, // filled in below, once qty/amount are final
          rateVaries: false,
          pricesSeen: new Set([item.price]),
        });
      }
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1)) // newest business-day key first
    .map(([key, day]) => ({
      key,
      label: dayLabel(key, language),
      totalSales: day.totalSales,
      orderCount: day.orderCount,
      items: [...day.items.values()]
        .map(({ pricesSeen, ...line }) => ({
          ...line,
          rate: line.qty > 0 ? line.amount / line.qty : 0,
          rateVaries: pricesSeen.size > 1,
        }))
        .sort((a, b) => b.amount - a.amount),
    }));
}
