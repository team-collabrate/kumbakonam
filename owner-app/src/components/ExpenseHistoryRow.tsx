import { useState } from "react";
import { ConfirmDialog, deleteExpense, formatCurrency, useLanguage, type Expense } from "@kumbakonam/shared";
import "./ExpenseHistoryRow.css";

const STRINGS = {
  delete: { en: "Delete", ta: "நீக்கு" },
  deleteTitle: { en: "Delete this expense?", ta: "இந்த செலவை நீக்கவா?" },
  deleteMessage: {
    en: "This can't be undone — use it for a mistyped or duplicate entry, not a real expense you no longer want counted.",
    ta: "இதை மீட்க முடியாது — தவறாக தட்டச்சு செய்யப்பட்ட அல்லது நகல் பதிவுக்கு மட்டும் பயன்படுத்தவும், இனி கணக்கிட வேண்டாத உண்மையான செலவுக்கு அல்ல.",
  },
  deleteConfirm: { en: "Delete", ta: "நீக்கு" },
  deleteFailed: { en: "Could not delete. Try again.", ta: "நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்." },
};

export interface ExpenseHistoryRowProps {
  expense: Expense;
  /** Omit to render without a delete control at all (kept optional so this
   *  stays a plain display row wherever showing one doesn't make sense). */
  onDeleted?: () => void;
}

/** One line of spending — a name, a time, an amount, and (if `onDeleted` is
 *  given) a way to remove it: the correction path for a mistyped or
 *  duplicate entry, which used to exist as a service function
 *  (deleteExpense) with no button anywhere in either app calling it. */
export function ExpenseHistoryRow({ expense, onDeleted }: ExpenseHistoryRowProps) {
  const { language } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteExpense(expense.expenseId);
      setConfirming(false);
      onDeleted?.();
    } catch (err) {
      console.error("Delete expense failed", err);
      setError(STRINGS.deleteFailed[language]);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="expense-row">
      <span className="expense-row__time">
        {/* Queued offline writes have no server timestamp until they sync. */}
        {expense.createdAt
          ? expense.createdAt.toDate().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
          : "—"}
      </span>
      <span className="expense-row__name">{expense.name}</span>
      <span className="expense-row__amount">−{formatCurrency(expense.amount)}</span>

      {onDeleted && (
        <button
          type="button"
          className="expense-row__delete"
          onClick={() => setConfirming(true)}
          aria-label={`${STRINGS.delete[language]} ${expense.name}`}
        >
          ×
        </button>
      )}

      {confirming && (
        <ConfirmDialog
          title={STRINGS.deleteTitle[language]}
          message={error ?? STRINGS.deleteMessage[language]}
          confirmLabel={deleting ? undefined : STRINGS.deleteConfirm[language]}
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
