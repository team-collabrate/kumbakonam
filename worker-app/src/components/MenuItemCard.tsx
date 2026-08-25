import { formatCurrency, type MenuItem } from "@kumbakonam/shared";
import "./MenuItemCard.css";

export interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <button type="button" className="menu-item-card" onClick={() => onAdd(item)}>
      <span className="menu-item-card__icon" aria-hidden="true">
        {item.name.charAt(0).toUpperCase()}
      </span>
      <span className="menu-item-card__name">{item.name}</span>
      <span className="menu-item-card__price">{formatCurrency(item.price)}</span>
    </button>
  );
}
