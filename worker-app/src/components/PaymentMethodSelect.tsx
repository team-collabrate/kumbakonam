import { useLanguage, type PaymentMethod } from "@kumbakonam/shared";
import "./PaymentMethodSelect.css";

/**
 * Key must match PAYMENT_KEYS in hooks/useKeyboardShortcuts.ts.
 *
 * No card: the cafe doesn't take them. That slot is now Split, for a bill
 * paid part in cash and part on GPay.
 */
const METHODS: Array<{ value: PaymentMethod; label: { en: string; ta: string }; key: string }> = [
  { value: "cash", label: { en: "Cash", ta: "பணம்" }, key: "C" },
  { value: "upi", label: { en: "UPI", ta: "UPI" }, key: "U" },
  { value: "split", label: { en: "Split", ta: "பிரித்து" }, key: "S" },
];

const ARIA_LABEL = { en: "Payment method", ta: "பணம் செலுத்தும் முறை" };

export interface PaymentMethodSelectProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelect({ value, onChange }: PaymentMethodSelectProps) {
  const { language } = useLanguage();
  return (
    <div className="payment-method" role="radiogroup" aria-label={ARIA_LABEL[language]}>
      {METHODS.map((method) => (
        <button
          key={method.value}
          type="button"
          role="radio"
          aria-checked={value === method.value}
          className={`payment-method__option ${value === method.value ? "is-selected" : ""}`}
          onClick={() => onChange(method.value)}
        >
          {method.label[language]} <span className="payment-method__key">({method.key})</span>
        </button>
      ))}
    </div>
  );
}
