import { useEffect, useState } from "react";
import { describeFirestoreError, subscribeToOrdersInRange, type Order } from "@kumbakonam/shared";
import type { DateRange } from "../utils/dateRange";

export interface UseOrdersInRangeResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

/** Realtime — TDD §7 ("owner dashboard subscribes to orders via onSnapshot filtered by date range"). */
export function useOrdersInRange(range: DateRange): UseOrdersInRangeResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToOrdersInRange(
      new Date(startTime),
      new Date(endTime),
      (result) => {
        setError(null);
        setOrders(result);
        setLoading(false);
      },
      (err) => {
        console.error("Orders subscription failed", err);
        setError(describeFirestoreError(err));
        setLoading(false);
      },
    );
    return unsubscribe;
    // Depend on the primitive timestamps, not `range` itself — a new Date
    // object every render would otherwise resubscribe on every render.
  }, [startTime, endTime]);

  return { orders, loading, error };
}
