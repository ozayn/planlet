import {
  DEFAULT_LIFE_AREA_RENAME_MAP,
  UNCATEGORIZED_LIFE_AREA_LABEL,
} from "@/lib/life-areas/constants";

/** Default Life Area accent colors (subtle mid-tones for light + dark). */
export const LIFE_AREA_COLOR_BY_NAME: Readonly<Record<string, string>> = {
  "Career & Professional Life": "#527DA6",
  "Career & Job Search": "#527DA6",
  "Learning & Growth": "#73957B",
  "Learning & Development": "#73957B",
  "Projects & Creativity": "#9276A8",
  "Coding & Projects": "#9276A8",
  Relationships: "#B77F8B",
  "Health & Wellbeing": "#579A95",
  "Leisure & Experiences": "#C49A58",
  "Arts & Enjoyment": "#C49A58",
  "Home & Life Admin": "#87919C",
  "Home & Personal": "#87919C",
};

/** Neutral gray for Uncategorized — never a brand accent. */
export const UNCATEGORIZED_LIFE_AREA_COLOR = "#9C958E";

/**
 * Soft palette for custom Life Areas. Stable hash picks one — no user
 * color picker required.
 */
export const CUSTOM_LIFE_AREA_COLOR_PALETTE = [
  "#527DA6",
  "#73957B",
  "#9276A8",
  "#B77F8B",
  "#579A95",
  "#C49A58",
  "#87919C",
  "#6E8B9C",
  "#8A7E6E",
  "#7A8F7A",
] as const;

function hashLifeAreaName(name: string): number {
  let hash = 2166136261;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function colorForCustomLifeArea(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return UNCATEGORIZED_LIFE_AREA_COLOR;
  }
  const index =
    hashLifeAreaName(normalized.toLowerCase()) %
    CUSTOM_LIFE_AREA_COLOR_PALETTE.length;
  return CUSTOM_LIFE_AREA_COLOR_PALETTE[index]!;
}

/**
 * Resolve the accent color for a Life Area by name.
 * Defaults and legacy renamed defaults use the fixed palette; custom
 * names get a stable automatic color.
 */
export function resolveLifeAreaColor(
  name: string | null | undefined,
  options?: { uncategorized?: boolean },
): string {
  if (options?.uncategorized) {
    return UNCATEGORIZED_LIFE_AREA_COLOR;
  }

  const trimmed = name?.trim() ?? "";
  if (!trimmed || trimmed === UNCATEGORIZED_LIFE_AREA_LABEL) {
    return UNCATEGORIZED_LIFE_AREA_COLOR;
  }

  const mapped = LIFE_AREA_COLOR_BY_NAME[trimmed];
  if (mapped) {
    return mapped;
  }

  const renamed = DEFAULT_LIFE_AREA_RENAME_MAP[trimmed];
  if (renamed && LIFE_AREA_COLOR_BY_NAME[renamed]) {
    return LIFE_AREA_COLOR_BY_NAME[renamed]!;
  }

  return colorForCustomLifeArea(trimmed);
}
