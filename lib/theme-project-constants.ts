export const SUGGESTED_THEME_NAMES = [
  "Career",
  "Health",
  "Relationships",
  "Creativity",
  "Community",
  "Learning",
  "Inner Work",
  "Home",
  "Admin",
] as const;

export type SuggestedThemeName = (typeof SUGGESTED_THEME_NAMES)[number];
