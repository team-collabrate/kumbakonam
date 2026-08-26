import type { Timestamp } from "firebase/firestore";

/** `menu/{itemId}` document — see 05_Data_Model.md §3 */
export interface MenuItem {
  itemId: string;
  /** Canonical name — English/Tanglish, ASCII-safe. Used for orders, receipts, and ESC/POS printing (most thermal printers can't render Tamil glyphs). */
  name: string;
  /** Tamil-script display name shown on-screen when the app language is Tamil. Falls back to `name` if unset. */
  nameTa?: string;
  /** In INR, e.g. 40 */
  price: number;
  category?: string;
  /** Single emoji shown on the item card, e.g. "☕". No image upload — keeps the stack free of Storage. */
  icon?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
