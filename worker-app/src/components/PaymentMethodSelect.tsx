import { useLanguage, type PaymentMethod } from "@kumbakonam/shared";
import "./PaymentMethodSelect.css";

const METHODS: Array<{ value: PaymentMethod; label: { en: string; ta: string } }> = [
  { value: "cash", label: { en: "Cash", ta: "பணம்" } },
  { value: "upi", label: { en: "UPI", ta: "UPI" } },
  { value: "card", label: { en: "Card", ta: "கார்டு" } },
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
          {method.label[language]}
        </button>
      ))}
    </div>
  );
}
