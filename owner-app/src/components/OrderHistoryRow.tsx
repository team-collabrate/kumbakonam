import { useState } from "react";
import { formatCurrency, translateItemName, useLanguage, type Language, type Order } from "@kumbakonam/shared";
import "./OrderHistoryRow.css";

/** Exhaustive over PaymentMethod on purpose: "card" is no longer offered at
 *  the till, but orders taken before the change still carry it and must not
 *  render a blank label here. */
const PAYMENT_LABEL: Record<Order["paymentMethod"], Record<Language, string>> = {
  cash: { en: "Cash", ta: "பணம்" },
  upi: { en: "UPI", ta: "UPI" },
  split: { en: "Split", ta: "பிரித்து" },
  card: { en: "Card", ta: "கார்டு" },
};

const STRINGS = {
  item: { en: "item", ta: "பொருள்" },
  items: { en: "items", ta: "பொருட்கள்" },
  note: { en: "note", ta: "குறிப்பு" },
  discount: { en: "Discount", ta: "தள்ளுபடி" },
  gpay: { en: "GPay", ta: "GPay" },
  cash: { en: "Cash", ta: "ரொக்கம்" },
};

export interface OrderHistoryRowProps {
  order: Order;
}

/** Design Brief §7 — "Order history row (expandable to show items)". */
export function OrderHistoryRow({ order }: OrderHistoryRowProps) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="order-row">
      <button type="button" className="order-row__summary" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <div className="order-row__summary-left">
          <span className="order-row__time">
            {order.createdAt.toDate().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </span>
          <span className="order-row__meta">
            {itemCount} {itemCount === 1 ? STRINGS.item[language] : STRINGS.items[language]} ·{" "}
            {PAYMENT_LABEL[order.paymentMethod][language]}
          </span>
        </div>
        <span className="order-row__total">{formatCurrency(order.total)}</span>
        <span className={`order-row__chevron ${expanded ? "is-expanded" : ""}`} aria-hidden="true">
          ▼
        </span>
      </button>

      {expanded && (
        <div className="order-row__details">
          <ul>
            {order.items.map((item, index) => (
              <li key={index}>
                <div className="order-row__item-line">
                  <span>
                    {item.qty}x {translateItemName(item, language)}
                  </span>
                  <span>{formatCurrency(item.price * item.qty)}</span>
                </div>
                {item.note && (
                  <p className="order-row__item-note">
                    {STRINGS.note[language]}: {item.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {/* Only orders taken before discounts were dropped carry one. */}
          {order.discount > 0 && (
            <div className="order-row__discount-line">
              <span>{STRINGS.discount[language]}</span>
              <span>−{formatCurrency(order.discount)}</span>
            </div>
          )}
          {order.paymentMethod === "split" && (
            <div className="order-row__split">
              <div className="order-row__split-line">
                <span>{STRINGS.gpay[language]}</span>
                <span>{formatCurrency(order.upiAmount ?? 0)}</span>
              </div>
              <div className="order-row__split-line">
                <span>{STRINGS.cash[language]}</span>
                <span>{formatCurrency(order.cashAmount ?? 0)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
