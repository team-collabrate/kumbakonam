import { useCallback, useMemo, useState } from "react";
import type { MenuItem } from "@kumbakonam/shared";

export const ALL_TAB = "All";

export interface UseMenuCategoriesResult {
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  /** Moves to the previous/next tab, wrapping around — used by the ←/→ keyboard shortcuts. */
  cycleCategory: (direction: 1 | -1) => void;
  visibleItems: MenuItem[];
}

/** Category-tab state, lifted out of MenuGrid so keyboard shortcuts (WorkerHome) can read/drive it too. */
export function useMenuCategories(items: MenuItem[]): UseMenuCategoriesResult {
  const [activeCategory, setActiveCategory] = useState(ALL_TAB);

  const categories = useMemo(() => {
    const found = new Set<string>();
    items.forEach((item) => {
      if (item.category) found.add(item.category);
    });
    return [ALL_TAB, ...Array.from(found).sort()];
  }, [items]);

  const cycleCategory = useCallback(
    (direction: 1 | -1) => {
      setActiveCategory((current) => {
        const index = categories.indexOf(current);
        const safeIndex = index === -1 ? 0 : index;
        const next = (safeIndex + direction + categories.length) % categories.length;
        return categories[next];
      });
    },
    [categories],
  );

  const visibleItems = useMemo(
    () => (activeCategory === ALL_TAB ? items : items.filter((i) => i.category === activeCategory)),
    [items, activeCategory],
  );

  return { categories, activeCategory, setActiveCategory, cycleCategory, visibleItems };
}
