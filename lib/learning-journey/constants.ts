import type {
  LearningCategory,
  LearningSourceType,
} from "@/app/generated/prisma/client";

export const LEARNING_SOURCE_TYPES = [
  "MUSEUM",
  "BOOK",
  "ARTICLE",
  "PODCAST",
  "YOUTUBE",
  "COURSE",
  "FRIEND",
  "CONVERSATION",
  "THERAPY",
  "IMPROV",
  "WORK",
  "PROJECT",
  "TRAVEL",
  "LIFE",
  "OTHER",
] as const satisfies readonly LearningSourceType[];

export const LEARNING_CATEGORIES = [
  "ART",
  "HISTORY",
  "PHILOSOPHY",
  "PSYCHOLOGY",
  "MACHINE_LEARNING",
  "DATA_ENGINEERING",
  "CAREER",
  "RELATIONSHIPS",
  "BODY",
  "CREATIVITY",
  "IMPROV",
  "MEDITATION",
  "POLITICS",
  "CULTURE",
  "SCIENCE",
  "TECHNOLOGY",
  "LANGUAGE",
  "SELF_UNDERSTANDING",
  "OTHER",
] as const satisfies readonly LearningCategory[];

export type LearningSourceTypeValue = (typeof LEARNING_SOURCE_TYPES)[number];
export type LearningCategoryValue = (typeof LEARNING_CATEGORIES)[number];

export const LEARNING_SOURCE_TYPE_LABELS: Record<
  LearningSourceTypeValue,
  string
> = {
  MUSEUM: "Museum",
  BOOK: "Book",
  ARTICLE: "Article",
  PODCAST: "Podcast",
  YOUTUBE: "YouTube",
  COURSE: "Course",
  FRIEND: "Friend",
  CONVERSATION: "Conversation",
  THERAPY: "Therapy",
  IMPROV: "Improv",
  WORK: "Work",
  PROJECT: "Project",
  TRAVEL: "Travel",
  LIFE: "Life",
  OTHER: "Other",
};

export const LEARNING_CATEGORY_LABELS: Record<LearningCategoryValue, string> = {
  ART: "Art",
  HISTORY: "History",
  PHILOSOPHY: "Philosophy",
  PSYCHOLOGY: "Psychology",
  MACHINE_LEARNING: "Machine Learning",
  DATA_ENGINEERING: "Data Engineering",
  CAREER: "Career",
  RELATIONSHIPS: "Relationships",
  BODY: "Body",
  CREATIVITY: "Creativity",
  IMPROV: "Improv",
  MEDITATION: "Meditation",
  POLITICS: "Politics",
  CULTURE: "Culture",
  SCIENCE: "Science",
  TECHNOLOGY: "Technology",
  LANGUAGE: "Language",
  SELF_UNDERSTANDING: "Self-understanding",
  OTHER: "Other",
};

export const MAX_LEARNING_THEMES = 12;
export const MAX_LEARNING_THEME_LENGTH = 40;
export const MEANINGFUL_IMPORTANCE_MIN = 3;
export const DERIVED_LEARNING_TITLE_MAX_LENGTH = 80;

export const LEARNING_DEFAULT_THEMES = LEARNING_CATEGORIES.filter(
  (category) => category !== "OTHER",
).map((category) => LEARNING_CATEGORY_LABELS[category]);

export type SerializedLearningEntry = {
  id: string;
  title: string;
  summary: string;
  sourceType: LearningSourceTypeValue | null;
  sourceTypeLabel: string | null;
  sourceName: string | null;
  category: LearningCategoryValue | null;
  categoryLabel: string | null;
  learnedAt: string;
  learnedAtLabel: string;
  notes: string | null;
  importance: number;
  themes: string[];
  createdAt: string;
};

export type LearningJourneyPageData = {
  entries: SerializedLearningEntry[];
  defaultLearnedAt: string;
  userTimezone: string;
};

export type CreateLearningEntryInput = {
  summary?: string | null;
  title?: string | null;
  sourceType?: LearningSourceTypeValue | null;
  sourceName?: string | null;
  category?: LearningCategoryValue | null;
  learnedAt?: string | null;
  notes?: string | null;
  importance?: number | null;
  themes?: string[];
};

export type UpdateLearningEntryInput = {
  title?: string | null;
  summary?: string | null;
  sourceType?: LearningSourceTypeValue | null;
  sourceName?: string | null;
  category?: LearningCategoryValue | null;
  learnedAt?: string | null;
  notes?: string | null;
  importance?: number | null;
  themes?: string[];
};

export function isLearningSourceType(
  value: string | null | undefined,
): value is LearningSourceTypeValue {
  return Boolean(
    value &&
      LEARNING_SOURCE_TYPES.includes(value as LearningSourceTypeValue),
  );
}

export function isLearningCategory(
  value: string | null | undefined,
): value is LearningCategoryValue {
  return Boolean(
    value && LEARNING_CATEGORIES.includes(value as LearningCategoryValue),
  );
}

export function normalizeLearningThemeKey(theme: string): string {
  return theme.trim().toLowerCase();
}

export function normalizeLearningTheme(theme: string): string | null {
  const trimmed = theme.trim().slice(0, MAX_LEARNING_THEME_LENGTH);
  if (!trimmed) {
    return null;
  }

  const defaultMatch = LEARNING_DEFAULT_THEMES.find(
    (label) => normalizeLearningThemeKey(label) === normalizeLearningThemeKey(trimmed),
  );

  return defaultMatch ?? trimmed;
}

export function normalizeLearningThemes(
  themes: string[] | null | undefined,
): string[] {
  if (!themes?.length) {
    return [];
  }

  const seen = new Set<string>();
  const normalizedThemes: string[] = [];

  for (const rawTheme of themes) {
    const theme = normalizeLearningTheme(rawTheme);
    if (!theme) {
      continue;
    }

    const key = normalizeLearningThemeKey(theme);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedThemes.push(theme);

    if (normalizedThemes.length >= MAX_LEARNING_THEMES) {
      break;
    }
  }

  return normalizedThemes;
}

export function toggleLearningTheme(themes: string[], theme: string): string[] {
  const normalized = normalizeLearningTheme(theme);
  if (!normalized) {
    return themes;
  }

  const key = normalizeLearningThemeKey(normalized);
  if (themes.some((item) => normalizeLearningThemeKey(item) === key)) {
    return themes.filter((item) => normalizeLearningThemeKey(item) !== key);
  }

  if (themes.length >= MAX_LEARNING_THEMES) {
    return themes;
  }

  return [...themes, normalized];
}

export function addLearningTheme(themes: string[], theme: string): string[] {
  const normalized = normalizeLearningTheme(theme);
  if (!normalized) {
    return themes;
  }

  const key = normalizeLearningThemeKey(normalized);
  if (themes.some((item) => normalizeLearningThemeKey(item) === key)) {
    return themes;
  }

  if (themes.length >= MAX_LEARNING_THEMES) {
    return themes;
  }

  return [...themes, normalized];
}

export function getCustomLearningThemes(themes: string[]): string[] {
  const defaultKeys = new Set(
    LEARNING_DEFAULT_THEMES.map((theme) => normalizeLearningThemeKey(theme)),
  );

  return themes.filter(
    (theme) => !defaultKeys.has(normalizeLearningThemeKey(theme)),
  );
}

export function formatLearningImportanceLabel(importance: number): string {
  const value = Math.min(5, Math.max(1, Math.round(importance)));

  switch (value) {
    case 1:
      return "Quiet note";
    case 2:
      return "Worth remembering";
    case 3:
      return "Meaningful";
    case 4:
      return "Important";
    case 5:
      return "Core insight";
    default:
      return "Meaningful";
  }
}
