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
  tags: string[];
  createdAt: string;
};

export type LearningJourneyPageData = {
  entries: SerializedLearningEntry[];
  defaultLearnedAt: string;
  userTimezone: string;
};

export type CreateLearningEntryInput = {
  summary: string;
  title?: string | null;
  sourceType?: LearningSourceTypeValue | null;
  sourceName?: string | null;
  category?: LearningCategoryValue | null;
  learnedAt?: string | null;
  notes?: string | null;
  importance?: number | null;
  tags?: string | null;
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
  tags?: string | null;
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

export function parseLearningEntryTags(raw: string | null | undefined): string[] {
  const MAX_TAG_LENGTH = 40;
  const MAX_TAGS = 12;

  if (!raw?.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of raw.split(",")) {
    const tag = part.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) {
      continue;
    }

    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(tag);

    if (tags.length >= MAX_TAGS) {
      break;
    }
  }

  return tags;
}

export function formatLearningEntryTags(tags: string[]): string {
  return tags.join(", ");
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
