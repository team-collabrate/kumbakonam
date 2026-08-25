import { useState, type FormEvent } from "react";
import type { MenuItem } from "@kumbakonam/shared";
import "./MenuItemForm.css";

export interface MenuItemFormValues {
  name: string;
  price: number;
  category: string;
  icon: string;
  active: boolean;
}

export interface MenuItemFormProps {
  item?: MenuItem;
  existingCategories: string[];
  saving: boolean;
  error: string | null;
  onSave: (values: MenuItemFormValues) => void;
  onClose: () => void;
}

const ICON_SUGGESTIONS = ["☕", "🍵", "🥛", "🍛", "🍚", "🥞", "🍩", "🥪", "🍳", "🥟", "🍮", "🍬", "🌯", "🍋", "🍽️"];

/** Design Brief §7 — "Menu edit form (name, price, category toggle, active switch)". */
export function MenuItemForm({ item, existingCategories, saving, error, onSave, onClose }: MenuItemFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [icon, setIcon] = useState(item?.icon ?? "");
  const [active, setActive] = useState(item?.active ?? true);

  const isValid = name.trim().length > 0 && Number(price) > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({ name: name.trim(), price: Number(price), category: category.trim(), icon: icon.trim(), active });
  };

  return (
    <div className="menu-form__backdrop" role="dialog" aria-modal="true" aria-label={item ? "Edit item" : "Add item"}>
      <form className="menu-form" onSubmit={handleSubmit}>
        <h2 className="menu-form__title">{item ? "Edit Item" : "Add Item"}</h2>

        <label className="menu-form__field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Filter Coffee" required />
        </label>

        <label className="menu-form__field">
          <span>Price (₹)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="40"
            required
          />
        </label>

        <label className="menu-form__field">
          <span>Category</span>
          <input
            type="text"
            list="menu-form-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Beverages"
          />
          <datalist id="menu-form-categories">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="menu-form__field">
          <span>Icon (optional)</span>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="☕"
            maxLength={4}
          />
        </label>

        <div className="menu-form__icon-suggestions">
          {ICON_SUGGESTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`menu-form__icon-chip ${icon === emoji ? "is-selected" : ""}`}
              onClick={() => setIcon(emoji)}
              aria-label={`Use ${emoji} icon`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label className="menu-form__toggle-field">
          <span>Active</span>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </label>

        {error && <p className="menu-form__error">{error}</p>}

        <div className="menu-form__actions">
          <button type="button" className="menu-form__cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="menu-form__save" disabled={!isValid || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
