import type { KeyboardEvent, MouseEvent } from "react";
import { formatCurrency, ProductIcon, translateItemName, useLanguage, type MenuItem } from "@kumbakonam/shared";
import "./MenuItemCard.css";

/**
 * Item name -> photo, served from worker-app/public/items — produced by
 * scripts/prepare-item-images.mjs from food-images/, same pipeline
 * CATEGORY_IMAGE used in CategoryTabs.tsx. Keyed by the exact `name`
 * string in seed-menu.mjs; several variants of one dish (e.g. "Poori
 * (Single)" and "Poori Set") intentionally share one photo rather than
 * needing a separate shot per portion size.
 *
 * Items with no photo yet (no matching shot in food-images/, e.g. "Ghee
 * Roast", "Horlicks", "Tamarind Rice") fall back to the existing
 * hand-drawn icon or letter avatar — not a broken image.
 */
const MENU_ITEM_IMAGE: Record<string, string> = {
  Idli: "/items/idly.png",
  Pongal: "/items/pongal.png",
  "Poori (Single)": "/items/poori.png",
  "Poori Set": "/items/poori.png",
  "Chapathi (Single)": "/items/chappathi.png",
  "Chapathi Set": "/items/chappathi.png",
  "Idiyappam 1 Set": "/items/idiyappam.png",
  "Kal Dosa": "/items/kal-dosa.png",
  "Masala Dosa": "/items/masala-dosa.png",
  "Onion Dosa": "/items/onion-dosa.png",
  "Podi Dosa": "/items/podi-dosa.png",
  "Onion Podi Dosa": "/items/onion-podi-dosa.png",

  Meals: "/items/meals.png",
  "Parcel Meals": "/items/meals.png",
  "Veg Biryani": "/items/veg-briyani.png",
  "Tomato Rice": "/items/tomato-rice.png",
  "Lemon Rice": "/items/lemon-rice.png",
  "Curd Rice": "/items/curd-rice.png",
  "Sambar Rice": "/items/sambar-rice.png",

  "Veg Rice": "/items/rice.png",
  "Mushroom Noodles": "/items/noodles.png",
  "Paneer Noodles": "/items/noodles.png",
  Parotta: "/items/poratta.png",
  "Kothu Parotta": "/items/kothu-porotta.png",
  "Chilli Parotta": "/items/chilli-porotta.png",

  Tea: "/items/tea.png",
  "Black Tea": "/items/tea.png",
  "1/2 Parcel Tea": "/items/tea.png",
  "1 Parcel Tea": "/items/tea.png",
  "1-1/2 Parcel Tea": "/items/tea.png",
  Coffee: "/items/coffee.png",
  "Parcel Coffee": "/items/coffee.png",
  "1/2 Parcel Coffee": "/items/coffee.png",
  "1 Parcel Coffee": "/items/coffee.png",
  "1-1/2 Parcel Coffee": "/items/coffee.png",
  "Sukku Coffee": "/items/sukku-coffee.png",
  "Lemon Tea": "/items/lemon-tea.png",
  Milk: "/items/milk.png",
  "1 Milk": "/items/milk.png",
  "Badam Milk": "/items/badam-milk.png",
  "Badam Milk Parcel": "/items/badam-milk.png",
  Boost: "/items/boost.png",
  Water: "/items/water-bottle.png",
  "Water Can": "/items/water-bottle.png",

  Vadai: "/items/vada.png",
  Samosa: "/items/samosa.png",
  Bonda: "/items/bonda.png",
  Kesari: "/items/kesari.png",
  "Neyi Poli": "/items/boli.png",
  Paniyaram: "/items/paniyaram.png",
};

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
