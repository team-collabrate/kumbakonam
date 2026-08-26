import type { Timestamp } from "firebase/firestore";

export type PaymentMethod = "cash" | "upi" | "card";
export type OrderStatus = "completed";

/** Embedded line item inside `orders/{orderId}.items` — see 05_Data_Model.md §4 */
export interface OrderItem {
  itemId: string;
  /** Canonical English/Tanglish name — ASCII-safe, what's sent to the ESC/POS printer. */
  name: string;
  /** Tamil-script name captured at time of sale, for on-screen display only (bill view, order history, top items). */
  nameTa?: string;
  price: number;
  qty: number;
  note?: string;
}

/** `orders/{orderId}` document — see 05_Data_Model.md §4 */
export interface Order {
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  /** Reference to `users.userId` who created the order */
  workerId: string;
  createdAt: Timestamp;
  /** Set once the write is confirmed by the server; null while queued offline */
  syncedAt: Timestamp | null;
  status: OrderStatus;
}
