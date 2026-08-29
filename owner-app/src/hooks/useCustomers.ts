import { useEffect, useMemo, useState } from "react";
import { describeFirestoreError, subscribeToAllCustomers, useLanguage, type Customer } from "@kumbakonam/shared";

export interface UseCustomersResult {
  /** Everyone, settled or not — this is the owner's record. */
  customers: Customer[];
  /** Only those who currently owe, biggest first. */
  outstanding: Customer[];
  totalOutstanding: number;
  loading: boolean;
  error: string | null;
}

/**
 * Customer balances for the owner.
 *
 * Unlike the counter, the owner sees settled customers too: the till only
 * needs today's debts, but the dashboard is the record of who the regulars
 * are.
 */
export function useCustomers(): UseCustomersResult {
  const { language } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllCustomers(
      (result) => {
        setError(null);
        setCustomers(result);
        setLoading(false);
      },
      (err) => {
        console.error("Customers subscription failed", err);
        setError(describeFirestoreError(err, language));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [language]);

  const outstanding = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);
  const totalOutstanding = useMemo(() => outstanding.reduce((sum, c) => sum + c.balance, 0), [outstanding]);

  return { customers, outstanding, totalOutstanding, loading, error };
}
