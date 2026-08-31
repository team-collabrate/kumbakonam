import { formatCurrency, translateItemName, useLanguage } from "@kumbakonam/shared";
import type { CartLine } from "../hooks/useCart";
import "./CartLineItem.css";

const STRINGS = {
  each: { en: "each", ta: "ஒன்றுக்கு" },
  decrease: { en: "Decrease", ta: "குறை" },
  increase: { en: "Increase", ta: "கூட்டு" },
  quantity: { en: "quantity", ta: "எண்ணிக்கை" },
  remove: { en: "Remove", ta: "நீக்கு" },
  fromCart: { en: "from cart", ta: "கார்ட்டிலிருந்து" },
};

export interface CartLineItemProps {
  line: CartLine;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

export function CartLineItem({ line, onIncrement, onDecrement, onRemove }: CartLineItemProps) {
  const { language } = useLanguage();
  const displayName = translateItemName(line, language);
  return (
    <li className="cart-line">
      <div className="cart-line__row">
        <div className="cart-line__info">
          <span className="cart-line__name">{displayName}</span>
          <span className="cart-line__unit-price">
            {formatCurrency(line.price)} {STRINGS.each[language]}
          </span>
        </div>

        <div className="cart-line__stepper">
          <button
            type="button"
            onClick={() => onDecrement(line.itemId)}
            aria-label={`${STRINGS.decrease[language]} ${displayName} ${STRINGS.quantity[language]}`}
          >
            −
          </button>
          <span className="cart-line__qty">{line.qty}</span>
          <button
            type="button"
            onClick={() => onIncrement(line.itemId)}
            aria-label={`${STRINGS.increase[language]} ${displayName} ${STRINGS.quantity[language]}`}
          >
            +
          </button>
        </div>

        <span className="cart-line__total">{formatCurrency(line.price * line.qty)}</span>

        <button
          type="button"
          className="cart-line__remove"
          onClick={() => onRemove(line.itemId)}
          aria-label={`${STRINGS.remove[language]} ${displayName} ${STRINGS.fromCart[language]}`}
        >
          ×
        </button>
      </div>
    </li>
  );
}
