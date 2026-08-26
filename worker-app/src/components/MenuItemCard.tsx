import { formatCurrency, translateItemName, useLanguage, type MenuItem } from "@kumbakonam/shared";
import "./MenuItemCard.css";

export interface MenuItemCardProps {
  item: MenuItem;
  /** Keyboard digit that adds this item — shown as a small badge, undefined past the 10th visible item. */
  shortcutKey?: string;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, shortcutKey, onAdd }: MenuItemCardProps) {
  const { language } = useLanguage();
  const displayName = translateItemName(item, language);
  return (
    <button type="button" className="menu-item-card" onClick={() => onAdd(item)}>
      {shortcutKey && (
        <span className="menu-item-card__shortcut" aria-hidden="true">
          {shortcutKey}
        </span>
      )}
      <span className={`menu-item-card__icon ${item.icon ? "is-emoji" : ""}`} aria-hidden="true">
        {item.icon || displayName.charAt(0).toUpperCase()}
      </span>
      <span className="menu-item-card__name">{displayName}</span>
      <span className="menu-item-card__price">{formatCurrency(item.price)}</span>
    </button>
  );
}
