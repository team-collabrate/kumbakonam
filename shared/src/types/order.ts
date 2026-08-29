import type { Timestamp } from "firebase/firestore";

/**
 * `split` is cash and UPI together on one bill — the cafe takes no cards, so
 * the card button became the split button.
 *
 * `card` is legacy: no longer offered at the till, but orders taken before
 * the change still carry it, so it stays in the union. Dropping it would
 * make historical orders render a blank payment label in the owner app.
 */
export type PaymentMethod = "cash" | "upi" | "split" | "card";
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
  /**
   * Always 0 for orders taken from 2026-08-29 onward — the cafe gives no
   * discounts and the till no longer offers one. Kept on the document
   * because earlier orders have real values here and the owner's history
   * still has to add up.
   */
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  /** Cash portion of a `split` bill. Absent on every other payment method. */
  cashAmount?: number;
  /** UPI/GPay portion of a `split` bill. Absent on every other method. */
  upiAmount?: number;
  /** Reference to `users.userId` who created the order */
  workerId: string;
  createdAt: Timestamp;
  /** Set once the write is confirmed by the server; null while queued offline */
  syncedAt: Timestamp | null;
  status: OrderStatus;
}
