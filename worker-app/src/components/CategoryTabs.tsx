import { translateCategory, useLanguage } from "@kumbakonam/shared";
import "./CategoryTabs.css";

const STRINGS = {
  categoriesLabel: { en: "Menu categories", ta: "மெனு பிரிவுகள்" },
};

/** Category -> photo, served from worker-app/public/categories (see
 *  scripts/prepare-category-images.mjs). A category with no entry here
 *  falls back to the plain text chip below, so an older or owner-added
 *  category never renders as a broken image. */
const CATEGORY_IMAGE: Record<string, string> = {
  Breakfast: "/categories/breakfast.png",
  Lunch: "/categories/lunch.png",
  Dinner: "/categories/dinner.png",
  Tea: "/categories/tea.png",
  Vadai: "/categories/vadai.png",
};

export interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * The category tab strip. Lives in the counter header beside the logo rather
 * than above the grid, so the menu itself starts at the top of its own
 * scroll area and nothing floats over the cards.
 */
export function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  const { language } = useLanguage();

  return (
    <div className="category-tabs" role="tablist" aria-label={STRINGS.categoriesLabel[language]}>
      {categories.map((category) => {
        const image = CATEGORY_IMAGE[category];
        const label = translateCategory(category, language);
        const active = activeCategory === category;

        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={active}
            className={`category-tabs__tab ${image ? "category-tabs__tab--photo" : "category-tabs__tab--plain"} ${active ? "is-active" : ""}`}
            onClick={() => onCategoryChange(category)}
          >
            {image && (
              <span className="category-tabs__photo" aria-hidden="true">
                <img src={image} alt="" width={64} height={64} loading="eager" />
              </span>
            )}
            <span className="category-tabs__label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
