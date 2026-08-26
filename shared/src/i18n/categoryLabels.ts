import type { Language } from "./LanguageContext";

/**
 * Menu category display names. `category` is stored on `MenuItem` as a
 * stable English slug (used for filtering/grouping); this only translates
 * how it's *shown* on screen. Unknown categories fall back to the raw slug.
 */
const CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  "Hot Drinks": { en: "Hot Drinks", ta: "சூடான பானங்கள்" },
  Juice: { en: "Juice", ta: "ஜூஸ்" },
  Snacks: { en: "Snacks", ta: "ஸ்நாக்ஸ்" },
};

export function translateCategory(category: string, language: Language): string {
  return CATEGORY_LABELS[category]?.[language] ?? category;
}

/** Display name for a menu item — Tamil script when available and selected, else the canonical name. */
export function translateItemName(item: { name: string; nameTa?: string }, language: Language): string {
  return language === "ta" && item.nameTa ? item.nameTa : item.name;
}
