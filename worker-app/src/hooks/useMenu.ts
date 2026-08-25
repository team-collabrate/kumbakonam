import { useEffect, useState } from "react";
import { subscribeToMenu, type MenuItem } from "@kumbakonam/shared";

export interface UseMenuResult {
  items: MenuItem[];
  loading: boolean;
}

/** Realtime menu — reflects Owner edits instantly with no restart (User Flow §3). */
export function useMenu(): UseMenuResult {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMenu((menuItems) => {
      setItems(menuItems);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { items, loading };
}
