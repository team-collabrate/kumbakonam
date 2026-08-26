import { useState } from "react";
import { ConfirmDialog, formatCurrency, useLanguage } from "@kumbakonam/shared";
import type { UseCartResult } from "../hooks/useCart";
import type { UseOrderSubmitResult } from "../hooks/useOrderSubmit";
import { CartLineItem } from "./CartLineItem";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { DiscountInput } from "./DiscountInput";
import "./CartPanel.css";

const STRINGS = {
  title: { en: "Current Order", ta: "தற்போதைய ஆர்டர்" },
  clearCart: { en: "Clear cart", ta: "கார்ட்டை காலி செய்" },
  clearTitle: { en: "Clear cart?", ta: "கார்ட்டை காலி செய்யவா?" },
  clearMessage: {
    en: "This removes every item from the current order. This can't be undone.",
    ta: "இது தற்போதைய ஆர்டரில் உள்ள அனைத்துப் பொருட்களையும் நீக்கும். இதை மீட்க முடியாது.",
  },
  clearConfirm: { en: "Clear Cart", ta: "கார்ட்டை காலி செய்" },
  empty: { en: "Tap a menu item to add it to the order.", ta: "ஆர்டரில் சேர்க்க ஒரு மெனு பொருளைத் தட்டவும்." },
  subtotal: { en: "Subtotal", ta: "கூட்டுத்தொகை" },
  discount: { en: "Discount", ta: "தள்ளுபடி" },
  total: { en: "Total", ta: "மொத்தம்" },
  saving: { en: "Saving…", ta: "சேமிக்கிறது…" },
  printBill: { en: "Print Bill", ta: "பில் அச்சிடு" },
};

export interface CartPanelProps {
  cart: UseCartResult;
  orderSubmit: UseOrderSubmitResult;
}

export function CartPanel({ cart, orderSubmit }: CartPanelProps) {
  const { language } = useLanguage();
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <div className="cart-panel">
      <div className="cart-panel__header">
        <h2>{STRINGS.title[language]}</h2>
        {!cart.isEmpty && (
          <button type="button" className="cart-panel__clear" onClick={() => setConfirmingClear(true)}>
            {STRINGS.clearCart[language]}
          </button>
        )}
      </div>

      {confirmingClear && (
        <ConfirmDialog
          title={STRINGS.clearTitle[language]}
          message={STRINGS.clearMessage[language]}
          confirmLabel={STRINGS.clearConfirm[language]}
          destructive
          onConfirm={() => {
            cart.clearCart();
            setConfirmingClear(false);
          }}
          onCancel={() => setConfirmingClear(false)}
        />
      )}

      <div className="cart-panel__lines">
        {cart.isEmpty ? (
          <p className="cart-panel__empty">{STRINGS.empty[language]}</p>
        ) : (
          <ul className="cart-panel__list">
            {cart.lines.map((line) => (
              <CartLineItem
                key={line.itemId}
                line={line}
                onIncrement={cart.incrementQty}
                onDecrement={cart.decrementQty}
                onRemove={cart.removeLine}
                onNoteChange={cart.setNote}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="cart-panel__footer">
        <DiscountInput
          mode={cart.discountMode}
          onModeChange={cart.setDiscountMode}
          value={cart.discountInput}
          onValueChange={cart.setDiscountInput}
        />

        <PaymentMethodSelect value={cart.paymentMethod} onChange={cart.setPaymentMethod} />

        <dl className="cart-panel__totals">
          <div>
            <dt>{STRINGS.subtotal[language]}</dt>
            <dd>{formatCurrency(cart.subtotal)}</dd>
          </div>
          {cart.discountAmount > 0 && (
            <div>
              <dt>{STRINGS.discount[language]}</dt>
              <dd>−{formatCurrency(cart.discountAmount)}</dd>
            </div>
          )}
          <div className="cart-panel__total-row">
            <dt>{STRINGS.total[language]}</dt>
            <dd>{formatCurrency(cart.total)}</dd>
          </div>
        </dl>

        <div
          className={`cart-panel__status ${orderSubmit.error ? "is-error" : orderSubmit.successMessage ? "is-success" : ""}`}
          role="status"
        >
          {orderSubmit.error ?? orderSubmit.successMessage ?? " "}
        </div>

        <button
          type="button"
          className="cart-panel__submit"
          onClick={orderSubmit.submit}
          disabled={orderSubmit.submitting || cart.isEmpty || !cart.paymentMethod}
        >
          {orderSubmit.submitting ? STRINGS.saving[language] : STRINGS.printBill[language]}
        </button>
      </div>
    </div>
  );
}
