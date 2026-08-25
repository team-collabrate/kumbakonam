import { useEffect, useState } from "react";
import { describeFirestoreError, subscribeToMenu, type MenuItem } from "@kumbakonam/shared";

export interface UseMenuItemsResult {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
}

/** Menu management needs every item, including inactive ones — unlike the Worker grid. */
export function useMenuItems(): UseMenuItemsResult {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToMenu(
      (menuItems) => {
        setError(null);
        setItems(menuItems);
        setLoading(false);
      },
      { activeOnly: false },
      (err) => {
        console.error("Menu subscription failed", err);
        setError(describeFirestoreError(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { items, loading, error };
}
