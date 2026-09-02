import { formatCurrency, useLanguage, type Expense } from "@kumbakonam/shared";
import { ExpenseHistoryRow } from "./ExpenseHistoryRow";
import "./TodaySpendingModal.css";

const STRINGS = {
  title: { en: "Today's spending", ta: "இன்றைய செலவு" },
  empty: { en: "Nothing spent today.", ta: "இன்று எதுவும் செலவு செய்யவில்லை." },
  close: { en: "Close", ta: "மூடு" },
};

export interface TodaySpendingModalProps {
  expenses: Expense[];
  totalSpent: number;
  onClose: () => void;
}

/** Pop-up behind the Dashboard's "Spent" figure — what the worker typed for
 *  each expense (Expense.name) plus its amount and time, newest first
 *  (subscribeToExpensesInRange already orders that way). The figure on the
 *  card is just a total; this is where the "spent on what" the owner asked
 *  for actually shows. */
export function TodaySpendingModal({ expenses, totalSpent, onClose }: TodaySpendingModalProps) {
  const { language } = useLanguage();

  return (
    <div className="spending-modal__backdrop" role="dialog" aria-modal="true" aria-label={STRINGS.title[language]}>
      <div className="spending-modal">
        <div className="spending-modal__header">
          <h2 className="spending-modal__title">{STRINGS.title[language]}</h2>
          <p className="spending-modal__total">−{formatCurrency(totalSpent)}</p>
        </div>

        {expenses.length === 0 ? (
          <p className="spending-modal__empty">{STRINGS.empty[language]}</p>
        ) : (
          <div className="spending-modal__list">
            {expenses.map((expense) => (
              <ExpenseHistoryRow key={expense.expenseId} expense={expense} />
            ))}
          </div>
        )}

        <button type="button" className="spending-modal__close" onClick={onClose}>
          {STRINGS.close[language]}
        </button>
      </div>
    </div>
  );
}
