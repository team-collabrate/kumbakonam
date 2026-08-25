import { useEffect, useState } from "react";
import { subscribeToMenu, type MenuItem } from "@kumbakonam/shared";

export interface UseMenuItemsResult {
  items: MenuItem[];
  loading: boolean;
}

/** Menu management needs every item, including inactive ones — unlike the Worker grid. */
export function useMenuItems(): UseMenuItemsResult {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMenu(
      (menuItems) => {
        setItems(menuItems);
        setLoading(false);
      },
      { activeOnly: false },
    );
    return unsubscribe;
  }, []);

  return { items, loading };
}
