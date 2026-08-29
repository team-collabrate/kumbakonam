import type { Timestamp } from "firebase/firestore";

/**
 * `expenses/{expenseId}` — money going out of the counter till: vegetables,
 * milk, gas, and the rest of the day's buying.
 *
 * Deliberately separate from `orders` rather than a negative order. Orders
 * are sales and feed the owner's revenue figures; mixing spend into them
 * would quietly corrupt every total the dashboard shows.
 */
export interface Expense {
  expenseId: string;
  /** What was bought, as the worker typed it, e.g. "Vegetables". */
  name: string;
  /** In INR. Always positive — the sign lives in the collection, not the number. */
  amount: number;
  /** Reference to `users.userId` who recorded it. */
  workerId: string;
  createdAt: Timestamp;
  /** Set once the write is confirmed by the server; null while queued offline. */
  syncedAt: Timestamp | null;
}
