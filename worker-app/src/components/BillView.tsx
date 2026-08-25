import { formatCurrency } from "@kumbakonam/shared";
import type { BillInput } from "../printing/escpos";
import "./BillView.css";

const PAYMENT_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card" };

export interface BillViewProps {
  bill: BillInput;
  canRetryPrint: boolean;
  onRetryPrint: () => void;
  onClose: () => void;
}

/** On-screen bill fallback — User Flow §1 ("printer not found → show on-screen bill fallback"), worker can screenshot/share it. */
export function BillView({ bill, canRetryPrint, onRetryPrint, onClose }: BillViewProps) {
  return (
    <div className="bill-view__backdrop" role="dialog" aria-modal="true" aria-label="Bill">
      <div className="bill-view">
        <p className="bill-view__notice">Printer unavailable — here's the bill to share.</p>

        <div className="bill-view__receipt">
          <h2 className="bill-view__cafe">{bill.cafeName}</h2>
          <p className="bill-view__meta">
            {bill.createdAt.toLocaleString("en-IN")} · #{bill.orderId.slice(-6)}
          </p>
          <p className="bill-view__meta">Served by: {bill.workerName}</p>
          <hr />
          <ul className="bill-view__items">
            {bill.items.map((item, index) => (
              <li key={index}>
                <div className="bill-view__item-row">
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span>{formatCurrency(item.price * item.qty)}</span>
                </div>
                {item.note && <p className="bill-view__item-note">note: {item.note}</p>}
              </li>
            ))}
          </ul>
          <hr />
          <div className="bill-view__row">
            <span>Subtotal</span>
            <span>{formatCurrency(bill.subtotal)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="bill-view__row">
              <span>Discount</span>
              <span>−{formatCurrency(bill.discount)}</span>
            </div>
          )}
          <div className="bill-view__row bill-view__row--total">
            <span>Total</span>
            <span>{formatCurrency(bill.total)}</span>
          </div>
          <p className="bill-view__meta">Payment: {PAYMENT_LABEL[bill.paymentMethod]}</p>
        </div>

        <div className="bill-view__actions">
          {canRetryPrint && (
            <button type="button" className="bill-view__retry" onClick={onRetryPrint}>
              Retry Print
            </button>
          )}
          <button type="button" className="bill-view__close" onClick={onClose}>
            Close · Next Order
          </button>
        </div>
      </div>
    </div>
  );
}
