import { useMemo, useState } from "react";
import {
  ConfirmDialog,
  createMenuItem,
  deleteMenuItem,
  setMenuItemActive,
  updateMenuItem,
  type MenuItem,
} from "@kumbakonam/shared";
import { useMenuItems } from "../hooks/useMenuItems";
import { MenuItemRow } from "../components/MenuItemRow";
import { MenuItemForm, type MenuItemFormValues } from "../components/MenuItemForm";
import "./MenuScreen.css";

type FormTarget = "new" | MenuItem | null;

export function MenuScreen() {
  const { items, loading, error: loadError } = useMenuItems();
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const handleSave = async (values: MenuItemFormValues) => {
    setSaving(true);
    setError(null);
    try {
      if (formTarget === "new") {
        await createMenuItem({ name: values.name, price: values.price, category: values.category, icon: values.icon });
      } else if (formTarget) {
        await updateMenuItem(formTarget.itemId, values);
      }
      setFormTarget(null);
    } catch (err) {
      console.error("Menu item save failed", err);
      setError("Could not save this item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (item: MenuItem) => {
    setMenuItemActive(item.itemId, !item.active).catch((err) => console.error("Toggle active failed", err));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMenuItem(deleteTarget.itemId).catch((err) => console.error("Delete item failed", err));
    setDeleteTarget(null);
  };

  return (
    <div className="menu-screen">
      <div className="menu-screen__header">
        <h1 className="menu-screen__title">Menu</h1>
        <button type="button" className="menu-screen__add" onClick={() => setFormTarget("new")}>
          + Add Item
        </button>
      </div>

      {loadError ? (
        <p className="menu-screen__error">{loadError}</p>
      ) : loading ? (
        <p className="menu-screen__status">Loading…</p>
      ) : items.length === 0 ? (
        <p className="menu-screen__status">No menu items yet — add your first one.</p>
      ) : (
        <div className="menu-screen__list">
          {items.map((item) => (
            <MenuItemRow
              key={item.itemId}
              item={item}
              onEdit={setFormTarget}
              onToggleActive={handleToggleActive}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {formTarget && (
        <MenuItemForm
          item={formTarget === "new" ? undefined : formTarget}
          existingCategories={existingCategories}
          saving={saving}
          error={error}
          onSave={handleSave}
          onClose={() => {
            setFormTarget(null);
            setError(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete item?"
          message={`"${deleteTarget.name}" will be permanently removed from the menu. Past orders keep their own record, so this won't affect sales history.`}
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
