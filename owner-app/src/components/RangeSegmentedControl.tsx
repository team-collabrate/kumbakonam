import type { RangeMode } from "../utils/dateRange";
import "./RangeSegmentedControl.css";

const OPTIONS: Array<{ value: RangeMode; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export interface RangeSegmentedControlProps {
  value: RangeMode;
  onChange: (mode: RangeMode) => void;
}

export function RangeSegmentedControl({ value, onChange }: RangeSegmentedControlProps) {
  return (
    <div className="range-control" role="radiogroup" aria-label="Report period">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`range-control__option ${value === opt.value ? "is-selected" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
