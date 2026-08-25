import { useState } from "react";
import { formatCurrency, type Order } from "@kumbakonam/shared";
import "./OrderHistoryRow.css";

const PAYMENT_LABEL: Record<Order["paymentMethod"], string> = { cash: "Cash", upi: "UPI", card: "Card" };

export interface OrderHistoryRowProps {
  order: Order;
}

/** Design Brief §7 — "Order history row (expandable to show items)". */
export function OrderHistoryRow({ order }: OrderHistoryRowProps) {
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
            {itemCount} item{itemCount === 1 ? "" : "s"} · {PAYMENT_LABEL[order.paymentMethod]}
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
                    {item.qty}x {item.name}
                  </span>
                  <span>{formatCurrency(item.price * item.qty)}</span>
                </div>
                {item.note && <p className="order-row__item-note">note: {item.note}</p>}
              </li>
            ))}
          </ul>
          {order.discount > 0 && (
            <div className="order-row__discount-line">
              <span>Discount</span>
              <span>−{formatCurrency(order.discount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
