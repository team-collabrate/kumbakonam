import { useEffect, useState } from "react";
import { subscribeToOutstandingCustomers, type Customer } from "@kumbakonam/shared";

export interface UseOutstandingCustomersResult {
  customers: Customer[];
  loading: boolean;
}

/**
 * Everyone who currently owes. This is the counter's whole customer list —
 * settled customers fall out of it on their own, so the till never
 * accumulates names it no longer needs.
 */
export function useOutstandingCustomers(): UseOutstandingCustomersResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOutstandingCustomers(
      (result) => {
        setCustomers(result);
        setLoading(false);
      },
      (err) => {
        console.error("Customer subscription failed", err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { customers, loading };
}
