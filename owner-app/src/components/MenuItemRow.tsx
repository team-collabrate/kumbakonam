import { formatCurrency, type MenuItem } from "@kumbakonam/shared";
import "./MenuItemRow.css";

export interface MenuItemRowProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export function MenuItemRow({ item, onEdit, onToggleActive, onDelete }: MenuItemRowProps) {
  return (
    <div className={`menu-row ${item.active ? "" : "is-inactive"}`}>
      <button type="button" className="menu-row__info" onClick={() => onEdit(item)}>
        <span className="menu-row__name">{item.name}</span>
        <span className="menu-row__meta">
          {formatCurrency(item.price)}
          {item.category ? ` · ${item.category}` : ""}
        </span>
      </button>

      <label className="menu-row__switch" aria-label={`${item.name} active`}>
        <input type="checkbox" checked={item.active} onChange={() => onToggleActive(item)} />
        <span className="menu-row__switch-track" />
      </label>

      <button type="button" className="menu-row__delete" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}>
        🗑
      </button>
    </div>
  );
}
