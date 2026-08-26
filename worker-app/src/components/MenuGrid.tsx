import { useMemo, useState } from "react";
import { translateCategory, useLanguage, type MenuItem } from "@kumbakonam/shared";
import { MenuItemCard } from "./MenuItemCard";
import "./MenuGrid.css";

const ALL_TAB = "All";

const STRINGS = {
  all: { en: "All", ta: "அனைத்தும்" },
  categoriesLabel: { en: "Menu categories", ta: "மெனு பிரிவுகள்" },
  loading: { en: "Loading menu…", ta: "மெனு ஏற்றுகிறது…" },
  empty: {
    en: "No menu items yet — ask the owner to add some in the dashboard.",
    ta: "இன்னும் மெனு பொருட்கள் இல்லை — உரிமையாளரிடம் சேர்க்கச் சொல்லுங்கள்.",
  },
  emptyCategory: { en: "No items in this category.", ta: "இந்தப் பிரிவில் பொருட்கள் இல்லை." },
};

export interface MenuGridProps {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  onAddItem: (item: MenuItem) => void;
}

export function MenuGrid({ items, loading, error, onAddItem }: MenuGridProps) {
  const { language } = useLanguage();
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
        <div className="menu-grid__tabs" role="tablist" aria-label={STRINGS.categoriesLabel[language]}>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              className={`menu-grid__tab ${activeCategory === category ? "is-active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category === ALL_TAB ? STRINGS.all[language] : translateCategory(category, language)}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="menu-grid__status menu-grid__status--error">{error}</p>
      ) : loading ? (
        <p className="menu-grid__status">{STRINGS.loading[language]}</p>
      ) : items.length === 0 ? (
        <p className="menu-grid__status">{STRINGS.empty[language]}</p>
      ) : visibleItems.length === 0 ? (
        <p className="menu-grid__status">{STRINGS.emptyCategory[language]}</p>
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
