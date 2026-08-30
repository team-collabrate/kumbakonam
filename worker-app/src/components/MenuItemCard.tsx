import type { KeyboardEvent, MouseEvent } from "react";
import { formatCurrency, ProductIcon, translateItemName, useLanguage, type MenuItem } from "@kumbakonam/shared";
import "./MenuItemCard.css";

/**
 * Item name -> photo, served from worker-app/public/items (none prepared
 * yet). Empty for now, filled in the same way CATEGORY_IMAGE was in
 * CategoryTabs.tsx once real per-item photos exist — through the same
 * prepare-*-images.mjs pipeline, mapped by name, no Firestore/Storage
 * involved. An item with no entry here falls back to its existing
 * hand-drawn icon (or letter avatar) rather than a broken image, so the
 * card works today and only improves once photos are added.
 */
const MENU_ITEM_IMAGE: Record<string, string> = {};

export interface MenuItemCardProps {
  item: MenuItem;
  /** Keyboard digit that adds this item — shown as a small badge, undefined past the 10th visible item. */
  shortcutKey?: string;
  /** How many of this item are already in the cart — drives the + / −-1-+ swap. */
  qty: number;
  onAdd: (item: MenuItem) => void;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
}

const STRINGS = {
  add: { en: "Add", ta: "சேர்" },
  decrease: { en: "Decrease quantity", ta: "அளவை குறை" },
  increase: { en: "Increase quantity", ta: "அளவை கூட்டு" },
};

export function MenuItemCard({ item, shortcutKey, qty, onAdd, onIncrement, onDecrement }: MenuItemCardProps) {
  const { language } = useLanguage();
  const displayName = translateItemName(item, language);
  const image = MENU_ITEM_IMAGE[item.name];

  // The whole card still adds on tap, exactly as before — the qty stepper is
  // an additional fine control, not a replacement for that. Its own buttons
  // stop the click reaching this handler, or a tap on "+" would both
  // increment itself *and* re-trigger the card's own add underneath it.
  const handleCardActivate = () => onAdd(item);
  const stop = (e: MouseEvent) => e.stopPropagation();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardActivate();
    }
  };

  return (
    // A native <button> can't contain the stepper's own <button> children
    // (nested interactive controls are invalid HTML, and a browser will
    // silently unwrap the inner ones) — role="button" on a div is what
    // makes room for them while keeping the same tap/keyboard behaviour.
    <div
      className="menu-item-card"
      role="button"
      tabIndex={0}
      onClick={handleCardActivate}
      onKeyDown={handleKeyDown}
      aria-label={`${displayName}, ${formatCurrency(item.price)}`}
    >
      <div className="menu-item-card__media">
        {image ? (
          <img className="menu-item-card__photo" src={image} alt="" loading="lazy" />
        ) : (
          <ProductIcon name={item.name} icon={item.icon} fallbackLabel={displayName} variant="card" />
        )}
      </div>

      {/* Pure gradient, no content — kept separate from __media so the photo
          and the darkening never have to renegotiate stacking with anything
          drawn on top of them. */}
      <div className="menu-item-card__scrim" aria-hidden="true" />

      {shortcutKey && (
        <span className="menu-item-card__shortcut" aria-hidden="true">
          {shortcutKey}
        </span>
      )}

      <div className="menu-item-card__info">
        <span className="menu-item-card__name">{displayName}</span>
        <span className="menu-item-card__price">{formatCurrency(item.price)}</span>
      </div>

      <div className="menu-item-card__qty" onClick={stop}>
        {qty === 0 ? (
          <button
            type="button"
            className="menu-item-card__add"
            onClick={(e) => {
              stop(e);
              onAdd(item);
            }}
            aria-label={`${STRINGS.add[language]} ${displayName}`}
          >
            +
          </button>
        ) : (
          <div className="menu-item-card__stepper">
            <button
              type="button"
              className="menu-item-card__step"
              onClick={(e) => {
                stop(e);
                onDecrement(item.itemId);
              }}
              aria-label={STRINGS.decrease[language]}
            >
              −
            </button>
            <span className="menu-item-card__qty-value">{qty}</span>
            <button
              type="button"
              className="menu-item-card__step"
              onClick={(e) => {
                stop(e);
                onIncrement(item.itemId);
              }}
              aria-label={STRINGS.increase[language]}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
