import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createExpense, formatCurrency, useLanguage } from "@kumbakonam/shared";
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
  failed: { en: "Could not save. Please try again.", ta: "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்." },
  savedToday: { en: "Recorded just now", ta: "இப்போது பதிவு செய்தது" },
};

export interface ExpenseModalProps {
  workerId: string;
  onClose: () => void;
}

interface RecordedExpense {
  id: string;
  name: string;
  amount: number;
}

/**
 * Records money spent from the till.
 *
 * Stays open after each save and keeps a running list, because buying is a
 * trip, not a single purchase — a worker back from the market has vegetables,
 * milk and gas to enter, and closing after each one would make them reopen it
 * three times.
 */
export function ExpenseModal({ workerId, onClose }: ExpenseModalProps) {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<RecordedExpense[]>([]);
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

      setError(null);
      const { expenseId, committed } = createExpense({ name: trimmed, amount: value, workerId });

      // Treated as saved the moment it's in the local cache — the write
      // syncs on its own. Awaiting `committed` here would freeze the form
      // for the length of any wifi outage, since a Firestore write promise
      // doesn't resolve while offline.
      setRecorded((prev) => [{ id: expenseId, name: trimmed, amount: value }, ...prev]);
      setName("");
      setAmount("");
      nameRef.current?.focus();

      committed.catch((err) => {
        // A genuine refusal — bad rules, bad data. Worth showing, unlike
        // being offline, which is expected and self-healing.
        console.error("Expense write refused", err);
        setError(STRINGS.failed[language]);
        setRecorded((prev) => prev.filter((r) => r.id !== expenseId));
      });
    },
    [name, amount, workerId, language],
  );

  const total = recorded.reduce((sum, r) => sum + r.amount, 0);

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

        {recorded.length > 0 && (
          <div className="expense__recorded">
            <div className="expense__recorded-head">
              <span>{STRINGS.savedToday[language]}</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <ul>
              {recorded.map((r) => (
                <li key={r.id}>
                  <span>{r.name}</span>
                  <span>{formatCurrency(r.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
