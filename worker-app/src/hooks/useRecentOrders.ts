import { useEffect, useState } from "react";
import { subscribeToRecentOrders, type Order } from "@kumbakonam/shared";

export interface UseRecentOrdersResult {
  orders: Order[];
  loading: boolean;
}

/** The last N non-voided bills, live — backs the sidebar's "delete recent
 *  bill" panel. See subscribeToRecentOrders for why voided ones don't
 *  count toward N: a voided slot is replaced by the next-most-recent live
 *  order rather than just shrinking the list. */
export function useRecentOrders(count: number): UseRecentOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRecentOrders(
      count,
      (result) => {
        setOrders(result);
        setLoading(false);
      },
      (err) => {
        console.error("Recent orders subscription failed", err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [count]);

  return { orders, loading };
}
