import { useState } from "react";
import { ConfirmDialog, formatCurrency } from "@kumbakonam/shared";
import type { UseCartResult } from "../hooks/useCart";
import type { UseOrderSubmitResult } from "../hooks/useOrderSubmit";
import { CartLineItem } from "./CartLineItem";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { DiscountInput } from "./DiscountInput";
import "./CartPanel.css";

export interface CartPanelProps {
  cart: UseCartResult;
  orderSubmit: UseOrderSubmitResult;
}

export function CartPanel({ cart, orderSubmit }: CartPanelProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <div className="cart-panel">
      <div className="cart-panel__header">
        <h2>Current Order</h2>
        {!cart.isEmpty && (
          <button type="button" className="cart-panel__clear" onClick={() => setConfirmingClear(true)}>
            Clear cart
          </button>
        )}
      </div>

      {confirmingClear && (
        <ConfirmDialog
          title="Clear cart?"
          message="This removes every item from the current order. This can't be undone."
          confirmLabel="Clear Cart"
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
          <p className="cart-panel__empty">Tap a menu item to add it to the order.</p>
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
            <dt>Subtotal</dt>
            <dd>{formatCurrency(cart.subtotal)}</dd>
          </div>
          {cart.discountAmount > 0 && (
            <div>
              <dt>Discount</dt>
              <dd>−{formatCurrency(cart.discountAmount)}</dd>
            </div>
          )}
          <div className="cart-panel__total-row">
            <dt>Total</dt>
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
          {orderSubmit.submitting ? "Saving…" : "Print Bill"}
        </button>
      </div>
    </div>
  );
}
