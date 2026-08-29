import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createExpense, useLanguage } from "@kumbakonam/shared";
import "./ExpenseModal.css";

const STRINGS = {
  title: { en: "Record spending", ta: "செலவு பதிவு" },
  subtitle: {
    en: "Vegetables, milk, gas — anything paid for out of the till.",
    ta: "காய்கறி, பால், கேஸ் — கல்லாவிலிருந்து செலுத்திய அனைத்தும்.",
  },
  name: { en: "What was bought", ta: "என்ன வாங்கியது" },
  namePlaceholder: { en: "Vegetables", ta: "காய்கறி" },
  amount: { en: "Amount (₹)", ta: "தொகை (₹)" },
  save: { en: "Save", ta: "சேமி" },
  close: { en: "Close", ta: "மூடு" },
  needName: { en: "Type what was bought.", ta: "என்ன வாங்கியது என்று எழுதவும்." },
  needAmount: { en: "Enter an amount above zero.", ta: "பூஜ்ஜியத்திற்கு மேல் தொகையை உள்ளிடவும்." },
};

export interface ExpenseModalProps {
  workerId: string;
  /** Restored when a refused write reopens this — otherwise blank. */
  initialName?: string;
  initialAmount?: string;
  initialError?: string | null;
  onClose: () => void;
  /** Fired as soon as the entry is in the local cache; the parent closes. */
  onSaved: () => void;
  /** A genuine refusal, after the dialog has already gone. */
  onFailed: (values: { name: string; amount: string }) => void;
}

/** Records money spent from the till. One entry, then it gets out of the way. */
export function ExpenseModal({
  workerId,
  initialName = "",
  initialAmount = "",
  initialError = null,
  onClose,
  onSaved,
  onFailed,
}: ExpenseModalProps) {
  const { language } = useLanguage();
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState(initialAmount);
  const [error, setError] = useState<string | null>(initialError);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      const value = Number(amount);

      if (!trimmed) {
        setError(STRINGS.needName[language]);
        return;
      }
      if (!Number.isFinite(value) || value <= 0) {
        setError(STRINGS.needAmount[language]);
        return;
      }

      const { committed } = createExpense({ name: trimmed, amount: value, workerId });

      // Saved the moment it's in the local cache — the write syncs on its
      // own. Awaiting would hold the dialog open for the length of any wifi
      // outage, since a Firestore write promise doesn't resolve offline.
      onSaved();

      // This closure outlives the dialog on purpose. A refusal (bad rules,
      // a deactivated worker) has to reach someone, and by the time it
      // arrives this component is already unmounted — so the handler lives
      // in the parent, which reopens the form with the values intact.
      committed.catch((err) => {
        console.error("Expense write refused", err);
        onFailed({ name: trimmed, amount });
      });
    },
    [name, amount, workerId, language, onSaved, onFailed],
  );

  return (
    <div className="expense__backdrop" role="dialog" aria-modal="true" aria-label={STRINGS.title[language]}>
      <form className="expense" onSubmit={handleSubmit}>
        <div>
          <h2 className="expense__title">{STRINGS.title[language]}</h2>
          <p className="expense__subtitle">{STRINGS.subtitle[language]}</p>
        </div>

        <label className="expense__field">
          <span>{STRINGS.name[language]}</span>
          <input
            ref={nameRef}
            type="text"
            value={name}
            placeholder={STRINGS.namePlaceholder[language]}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </label>

        <label className="expense__field">
          <span>{STRINGS.amount[language]}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={amount}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="expense__status" role="status">
          {error ?? " "}
        </div>

        <div className="expense__actions">
          <button type="button" className="expense__close" onClick={onClose}>
            {STRINGS.close[language]}
          </button>
          <button type="submit" className="expense__save">
            {STRINGS.save[language]}
          </button>
        </div>
      </form>
    </div>
  );
}
