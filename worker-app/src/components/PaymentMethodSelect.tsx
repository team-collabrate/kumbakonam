import type { PaymentMethod } from "@kumbakonam/shared";
import "./PaymentMethodSelect.css";

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

export interface PaymentMethodSelectProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelect({ value, onChange }: PaymentMethodSelectProps) {
  return (
    <div className="payment-method" role="radiogroup" aria-label="Payment method">
      {METHODS.map((method) => (
        <button
          key={method.value}
          type="button"
          role="radio"
          aria-checked={value === method.value}
          className={`payment-method__option ${value === method.value ? "is-selected" : ""}`}
          onClick={() => onChange(method.value)}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
