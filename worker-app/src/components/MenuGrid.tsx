import { useMemo, useState } from "react";
import type { MenuItem } from "@kumbakonam/shared";
import { MenuItemCard } from "./MenuItemCard";
import "./MenuGrid.css";

const ALL_TAB = "All";

export interface MenuGridProps {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  onAddItem: (item: MenuItem) => void;
}

export function MenuGrid({ items, loading, error, onAddItem }: MenuGridProps) {
  const [activeCategory, setActiveCategory] = useState(ALL_TAB);

  const categories = useMemo(() => {
    const found = new Set<string>();
    items.forEach((item) => {
      if (item.category) found.add(item.category);
    });
    return [ALL_TAB, ...Array.from(found).sort()];
  }, [items]);

  const visibleItems = useMemo(
    () => (activeCategory === ALL_TAB ? items : items.filter((i) => i.category === activeCategory)),
    [items, activeCategory],
  );

  return (
    <div className="menu-grid">
      {categories.length > 1 && (
        <div className="menu-grid__tabs" role="tablist" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              className={`menu-grid__tab ${activeCategory === category ? "is-active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="menu-grid__status menu-grid__status--error">{error}</p>
      ) : loading ? (
        <p className="menu-grid__status">Loading menu…</p>
      ) : items.length === 0 ? (
        <p className="menu-grid__status">No menu items yet — ask the owner to add some in the dashboard.</p>
      ) : visibleItems.length === 0 ? (
        <p className="menu-grid__status">No items in this category.</p>
      ) : (
        <div className="menu-grid__items">
          {visibleItems.map((item) => (
            <MenuItemCard key={item.itemId} item={item} onAdd={onAddItem} />
          ))}
        </div>
      )}
    </div>
  );
}
