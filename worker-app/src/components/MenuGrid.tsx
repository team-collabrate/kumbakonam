import { useMemo } from "react";
import { useLanguage, type MenuItem } from "@kumbakonam/shared";
import { MenuItemCard } from "./MenuItemCard";
import type { CartLine } from "../hooks/useCart";
import "./MenuGrid.css";

const STRINGS = {
  loading: { en: "Loading menu…", ta: "மெனு ஏற்றுகிறது…" },
  empty: {
    en: "No menu items yet — ask the owner to add some in the dashboard.",
    ta: "இன்னும் மெனு பொருட்கள் இல்லை — உரிமையாளரிடம் சேர்க்கச் சொல்லுங்கள்.",
  },
  emptyCategory: { en: "No items in this category.", ta: "இந்தப் பிரிவில் பொருட்கள் இல்லை." },
};

/** Keys 1-9 then 0 map to the first 10 visible items — same order the ⌨ badges show. */
const SHORTCUT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export interface MenuGridProps {
  visibleItems: MenuItem[];
  totalItemCount: number;
  loading: boolean;
  error: string | null;
  /** Current cart contents — read only to look up each card's own quantity. */
  cartLines: CartLine[];
  onAddItem: (item: MenuItem) => void;
  onIncrementItem: (itemId: string) => void;
  onDecrementItem: (itemId: string) => void;
}

export function MenuGrid({
  visibleItems,
  totalItemCount,
  loading,
  error,
  cartLines,
  onAddItem,
  onIncrementItem,
  onDecrementItem,
}: MenuGridProps) {
  const { language } = useLanguage();

  const qtyByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cartLines) map.set(line.itemId, line.qty);
    return map;
  }, [cartLines]);

  return (
    <div className="menu-grid">
      {error ? (
        <p className="menu-grid__status menu-grid__status--error">{error}</p>
      ) : loading ? (
        <p className="menu-grid__status">{STRINGS.loading[language]}</p>
      ) : totalItemCount === 0 ? (
        <p className="menu-grid__status">{STRINGS.empty[language]}</p>
      ) : visibleItems.length === 0 ? (
        <p className="menu-grid__status">{STRINGS.emptyCategory[language]}</p>
      ) : (
        <div className="menu-grid__items">
          {visibleItems.map((item, index) => (
            <MenuItemCard
              key={item.itemId}
              item={item}
              shortcutKey={SHORTCUT_KEYS[index]}
              qty={qtyByItemId.get(item.itemId) ?? 0}
              onAdd={onAddItem}
              onIncrement={onIncrementItem}
              onDecrement={onDecrementItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
