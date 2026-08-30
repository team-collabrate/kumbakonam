import { translateCategory, useLanguage } from "@kumbakonam/shared";
import "./CategoryTabs.css";

const STRINGS = {
  categoriesLabel: { en: "Menu categories", ta: "மெனு பிரிவுகள்" },
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
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={activeCategory === category}
          className={`category-tabs__tab ${activeCategory === category ? "is-active" : ""}`}
          onClick={() => onCategoryChange(category)}
        >
          {translateCategory(category, language)}
        </button>
      ))}
    </div>
  );
}
