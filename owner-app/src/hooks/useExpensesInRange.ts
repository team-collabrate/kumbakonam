import { useEffect, useMemo, useState } from "react";
import { describeFirestoreError, subscribeToExpensesInRange, useLanguage, type Expense } from "@kumbakonam/shared";
import type { DateRange } from "../utils/dateRange";

export interface UseExpensesInRangeResult {
  expenses: Expense[];
  /** Sum of `amount` over the range — what the till paid out. */
  totalSpent: number;
  loading: boolean;
  error: string | null;
}

/** Realtime spend for a date range, mirroring useOrdersInRange. */
export function useExpensesInRange(range: DateRange): UseExpensesInRangeResult {
  const { language } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToExpensesInRange(
      new Date(startTime),
      new Date(endTime),
      (result) => {
        setError(null);
        setExpenses(result);
        setLoading(false);
      },
      (err) => {
        console.error("Expenses subscription failed", err);
        setError(describeFirestoreError(err, language));
        setLoading(false);
      },
    );
    return unsubscribe;
    // Primitive timestamps, not `range` — a fresh Date each render would
    // otherwise resubscribe every render.
  }, [startTime, endTime, language]);

  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  return { expenses, totalSpent, loading, error };
}
