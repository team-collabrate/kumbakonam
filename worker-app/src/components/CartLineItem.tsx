import { formatCurrency } from "@kumbakonam/shared";
import type { CartLine } from "../hooks/useCart";
import "./CartLineItem.css";

export interface CartLineItemProps {
  line: CartLine;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onNoteChange: (itemId: string, note: string) => void;
}

export function CartLineItem({ line, onIncrement, onDecrement, onRemove, onNoteChange }: CartLineItemProps) {
  return (
    <li className="cart-line">
      <div className="cart-line__row">
        <div className="cart-line__info">
          <span className="cart-line__name">{line.name}</span>
          <span className="cart-line__unit-price">{formatCurrency(line.price)} each</span>
        </div>

        <div className="cart-line__stepper">
          <button type="button" onClick={() => onDecrement(line.itemId)} aria-label={`Decrease ${line.name} quantity`}>
            −
          </button>
          <span className="cart-line__qty">{line.qty}</span>
          <button type="button" onClick={() => onIncrement(line.itemId)} aria-label={`Increase ${line.name} quantity`}>
            +
          </button>
        </div>

        <span className="cart-line__total">{formatCurrency(line.price * line.qty)}</span>

        <button
          type="button"
          className="cart-line__remove"
          onClick={() => onRemove(line.itemId)}
          aria-label={`Remove ${line.name} from cart`}
        >
          ×
        </button>
      </div>

      <input
        type="text"
        className="cart-line__note"
        placeholder="Add a note (e.g. less sugar)"
        value={line.note}
        onChange={(e) => onNoteChange(line.itemId, e.target.value)}
      />
    </li>
  );
}
