import type { PaymentMethod } from "@kumbakonam/shared";

/**
 * The shape of a printable bill.
 *
 * Receipts are rendered to a bitmap (receiptCanvas.ts) rather than emitted as
 * ESC/POS text, because the shop prints in Tamil and thermal printers only
 * carry single-byte Latin codepages. That also means names here keep their
 * Tamil script — nothing is forced back to ASCII for the printer's benefit.
 */
export interface BillLine {
  name: string;
  qty: number;
  price: number;
  note?: string;
}

export interface BillInput {
  orderId: string;
  /** Short human-facing reference shown as "Bill No" on the paper. */
  billNo: string;
  items: BillLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  /** Payment method in the receipt's own language (receipts always print Tamil). */
  paymentLabel: string;
  workerName: string;
  createdAt: Date;
}

const PAYMENT_LABEL_TA: Record<PaymentMethod, string> = {
  cash: "பணம்",
  upi: "UPI",
  card: "கார்டு",
};

export function paymentLabelForReceipt(method: PaymentMethod): string {
  return PAYMENT_LABEL_TA[method];
}

/**
 * Bill reference derived from the Firestore order id.
 *
 * NOTE: this is unique but *not* sequential — it can't be, without a shared
 * counter. If the shop needs strictly increasing bill numbers (for GST or
 * cash-book reconciliation) that requires a Firestore transaction, not a
 * device-local tally, or two tablets would issue the same number.
 */
export function billNoFromOrderId(orderId: string): string {
  return orderId.slice(-4).toUpperCase();
}
