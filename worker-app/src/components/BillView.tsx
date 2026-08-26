import { useEffect } from "react";
import { formatCurrency, translateItemName, useLanguage, type Language } from "@kumbakonam/shared";
import type { BillInput } from "../printing/escpos";
import "./BillView.css";

const PAYMENT_LABEL: Record<string, Record<Language, string>> = {
  cash: { en: "Cash", ta: "பணம்" },
  upi: { en: "UPI", ta: "UPI" },
  card: { en: "Card", ta: "கார்டு" },
};

const STRINGS = {
  notice: { en: "Printer unavailable — here's the bill to share.", ta: "பிரிண்டர் இல்லை — பகிர பில் இதோ." },
  servedBy: { en: "Served by", ta: "சேவை செய்தவர்" },
  note: { en: "note", ta: "குறிப்பு" },
  subtotal: { en: "Subtotal", ta: "கூட்டுத்தொகை" },
  discount: { en: "Discount", ta: "தள்ளுபடி" },
  total: { en: "Total", ta: "மொத்தம்" },
  payment: { en: "Payment", ta: "பணம் செலுத்தும் முறை" },
  retryPrint: { en: "Retry Print", ta: "மீண்டும் அச்சிடு" },
  closeNext: { en: "Close · Next Order", ta: "மூடு · அடுத்த ஆர்டர்" },
};

export interface BillViewProps {
  bill: BillInput;
  canRetryPrint: boolean;
  onRetryPrint: () => void;
  onClose: () => void;
}

/** On-screen bill fallback — User Flow §1 ("printer not found → show on-screen bill fallback"), worker can screenshot/share it. */
export function BillView({ bill, canRetryPrint, onRetryPrint, onClose }: BillViewProps) {
  const { language } = useLanguage();

  // Escape or Enter both move on to the next order — there's nothing to "cancel" here.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="bill-view__backdrop" role="dialog" aria-modal="true" aria-label="Bill">
      <div className="bill-view">
        <p className="bill-view__notice">{STRINGS.notice[language]}</p>

        <div className="bill-view__receipt">
          <h2 className="bill-view__cafe">{bill.cafeName}</h2>
          <p className="bill-view__meta">
            {bill.createdAt.toLocaleString("en-IN")} · #{bill.orderId.slice(-6)}
          </p>
          <p className="bill-view__meta">
            {STRINGS.servedBy[language]}: {bill.workerName}
          </p>
          <hr />
          <ul className="bill-view__items">
            {bill.items.map((item, index) => (
              <li key={index}>
                <div className="bill-view__item-row">
                  <span>
                    {item.qty}x {translateItemName(item, language)}
                  </span>
                  <span>{formatCurrency(item.price * item.qty)}</span>
                </div>
                {item.note && (
                  <p className="bill-view__item-note">
                    {STRINGS.note[language]}: {item.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <hr />
          <div className="bill-view__row">
            <span>{STRINGS.subtotal[language]}</span>
            <span>{formatCurrency(bill.subtotal)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="bill-view__row">
              <span>{STRINGS.discount[language]}</span>
              <span>−{formatCurrency(bill.discount)}</span>
            </div>
          )}
          <div className="bill-view__row bill-view__row--total">
            <span>{STRINGS.total[language]}</span>
            <span>{formatCurrency(bill.total)}</span>
          </div>
          <p className="bill-view__meta">
            {STRINGS.payment[language]}: {PAYMENT_LABEL[bill.paymentMethod][language]}
          </p>
        </div>

        <div className="bill-view__actions">
          {canRetryPrint && (
            <button type="button" className="bill-view__retry" onClick={onRetryPrint}>
              {STRINGS.retryPrint[language]}
            </button>
          )}
          <button type="button" className="bill-view__close" onClick={onClose}>
            {STRINGS.closeNext[language]}
          </button>
        </div>
      </div>
    </div>
  );
}
