import { useLanguage } from "@kumbakonam/shared";
import type { DiscountMode } from "../hooks/useCart";
import "./DiscountInput.css";

const STRINGS = {
  discount: { en: "Discount", ta: "தள்ளுபடி" },
  discountType: { en: "Discount type", ta: "தள்ளுபடி வகை" },
};

export interface DiscountInputProps {
  mode: DiscountMode;
  onModeChange: (mode: DiscountMode) => void;
  value: number;
  onValueChange: (value: number) => void;
}

/** PRD §5.1 — "optional, manual amount/%"; stored as a resolved flat ₹ amount (Data Model §4). */
export function DiscountInput({ mode, onModeChange, value, onValueChange }: DiscountInputProps) {
  const { language } = useLanguage();
  return (
    <div className="discount-input">
      <span className="discount-input__label">{STRINGS.discount[language]}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={mode === "percent" ? 100 : undefined}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onValueChange(e.target.valueAsNumber || 0)}
        className="discount-input__value"
      />
      <div className="discount-input__mode" role="radiogroup" aria-label={STRINGS.discountType[language]}>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "flat"}
          className={mode === "flat" ? "is-selected" : ""}
          onClick={() => onModeChange("flat")}
        >
          ₹
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "percent"}
          className={mode === "percent" ? "is-selected" : ""}
          onClick={() => onModeChange("percent")}
        >
          %
        </button>
      </div>
    </div>
  );
}
