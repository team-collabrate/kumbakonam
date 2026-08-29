import { formatCurrency, type Expense } from "@kumbakonam/shared";
import "./ExpenseHistoryRow.css";

export interface ExpenseHistoryRowProps {
  expense: Expense;
}

/** One line of spending. Flat, not expandable — an expense is a name and an
 *  amount, so there is nothing underneath to open. */
export function ExpenseHistoryRow({ expense }: ExpenseHistoryRowProps) {
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
    </div>
  );
}
