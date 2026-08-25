import type { Timestamp } from "firebase/firestore";

/** `menu/{itemId}` document — see 05_Data_Model.md §3 */
export interface MenuItem {
  itemId: string;
  name: string;
  /** In INR, e.g. 40 */
  price: number;
  category?: string;
  /** Single emoji shown on the item card, e.g. "☕". No image upload — keeps the stack free of Storage. */
  icon?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
