import { useEffect, useMemo, useState } from "react";
import { describeFirestoreError, subscribeToDailySummariesInRange, useLanguage } from "@kumbakonam/shared";
import type { DateRange } from "../utils/dateRange";

export interface UseDailySummariesInRangeResult {
  totalSales: number;
  totalSpent: number;
  loading: boolean;
  error: string | null;
}

/**
 * The permanent-totals half of a report figure — see
 * dailySummary.service.ts. Only ever has documents for business days
 * already past the 3-day detail window, so adding this to the matching
 * live orders/expenses-in-range totals never double-counts a day: each
 * day's total comes from exactly one of the two sources, never both.
 */
export function useDailySummariesInRange(range: DateRange): UseDailySummariesInRangeResult {
  const { language } = useLanguage();
  const [totalSales, setTotalSales] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToDailySummariesInRange(
      new Date(startTime),
      new Date(endTime),
      (summaries) => {
        setError(null);
        setTotalSales(summaries.reduce((sum, s) => sum + s.totalSales, 0));
        setTotalSpent(summaries.reduce((sum, s) => sum + s.totalSpent, 0));
        setLoading(false);
      },
      (err) => {
        console.error("Daily summaries subscription failed", err);
        setError(describeFirestoreError(err, language));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [startTime, endTime, language]);

  return useMemo(
    () => ({ totalSales, totalSpent, loading, error }),
    [totalSales, totalSpent, loading, error],
  );
}
