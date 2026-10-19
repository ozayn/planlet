/** Seed names for new users (and rename targets for legacy defaults). */
export const DEFAULT_LIFE_AREA_NAMES = [
  "Career & Professional Life",
  "Learning & Growth",
  "Projects & Creativity",
  "Relationships",
  "Health & Wellbeing",
  "Leisure & Experiences",
  "Home & Life Admin",
] as const;

/**
 * Exact-name renames from the original seeded defaults.
 * Only applied when a user's area still has the old name — customized
 * names are never overwritten.
 */
export const DEFAULT_LIFE_AREA_RENAME_MAP: Readonly<Record<string, string>> = {
  "Career & Job Search": "Career & Professional Life",
  "Learning & Development": "Learning & Growth",
  "Coding & Projects": "Projects & Creativity",
  "Arts & Enjoyment": "Leisure & Experiences",
  "Home & Personal": "Home & Life Admin",
};

/** Compact labels for the daily overview chip line. */
export const LIFE_AREA_SHORT_LABELS: Readonly<Record<string, string>> = {
  "Career & Professional Life": "Career",
  "Career & Job Search": "Career",
  "Learning & Growth": "Learning",
  "Learning & Development": "Learning",
  "Projects & Creativity": "Projects",
  "Coding & Projects": "Projects",
  Relationships: "Relationships",
  "Health & Wellbeing": "Health",
  "Leisure & Experiences": "Leisure",
  "Arts & Enjoyment": "Leisure",
  "Home & Life Admin": "Home",
  "Home & Personal": "Home",
};

export const MAX_LIFE_AREA_NAME_LENGTH = 80;
export const MAX_LIFE_AREAS_PER_USER = 40;
export const UNCATEGORIZED_LIFE_AREA_ID = "__uncategorized__";
export const UNCATEGORIZED_LIFE_AREA_LABEL = "Uncategorized";

export function shortLifeAreaLabel(name: string): string {
  const mapped = LIFE_AREA_SHORT_LABELS[name];
  if (mapped) {
    return mapped;
  }
  const beforeAmpersand = name.split("&")[0]?.trim();
  if (beforeAmpersand) {
    return beforeAmpersand;
  }
  return name.trim() || name;
}
