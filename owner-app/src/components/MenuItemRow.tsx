import { formatCurrency, translateCategory, translateItemName, useLanguage, type MenuItem } from "@kumbakonam/shared";
import "./MenuItemRow.css";

const STRINGS = {
  active: { en: "active", ta: "செயலில்" },
  delete: { en: "Delete", ta: "நீக்கு" },
};

export interface MenuItemRowProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export function MenuItemRow({ item, onEdit, onToggleActive, onDelete }: MenuItemRowProps) {
  const { language } = useLanguage();
  const displayName = translateItemName(item, language);
  return (
    <div className={`menu-row ${item.active ? "" : "is-inactive"}`}>
      <button type="button" className="menu-row__info" onClick={() => onEdit(item)}>
        <span className="menu-row__icon" aria-hidden="true">
          {item.icon || displayName.charAt(0).toUpperCase()}
        </span>
        <span className="menu-row__text">
          <span className="menu-row__name">{displayName}</span>
          <span className="menu-row__meta">
            {formatCurrency(item.price)}
            {item.category ? ` · ${translateCategory(item.category, language)}` : ""}
          </span>
        </span>
      </button>

      <label className="menu-row__switch" aria-label={`${displayName} ${STRINGS.active[language]}`}>
        <input type="checkbox" checked={item.active} onChange={() => onToggleActive(item)} />
        <span className="menu-row__switch-track" />
      </label>

      <button
        type="button"
        className="menu-row__delete"
        onClick={() => onDelete(item)}
        aria-label={`${STRINGS.delete[language]} ${displayName}`}
      >
        🗑
      </button>
    </div>
  );
}
