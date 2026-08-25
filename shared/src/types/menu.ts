import type { Timestamp } from "firebase/firestore";

/** `menu/{itemId}` document — see 05_Data_Model.md §3 */
export interface MenuItem {
  itemId: string;
  name: string;
  /** In INR, e.g. 40 */
  price: number;
  category?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
