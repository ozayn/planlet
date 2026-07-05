import type { IdeaCategory, IdeaStatus } from "@/app/generated/prisma/client";

export const IDEA_CATEGORIES = [
  "PRODUCT",
  "BUSINESS",
  "CAREER",
  "PHOTOGRAPHY",
  "LEARNING",
  "TRAVEL",
  "WRITING",
  "PERSONAL",
  "CREATIVE",
  "RESEARCH",
  "OTHER",
] as const satisfies readonly IdeaCategory[];

export const IDEA_STATUSES = [
  "NEW",
  "THINKING",
  "EXPLORING",
  "BUILDING",
  "ARCHIVED",
] as const satisfies readonly IdeaStatus[];

export type IdeaCategoryValue = (typeof IDEA_CATEGORIES)[number];
export type IdeaStatusValue = (typeof IDEA_STATUSES)[number];

export const IDEA_CATEGORY_LABELS: Record<IdeaCategoryValue, string> = {
  PRODUCT: "Product",
  BUSINESS: "Business",
  CAREER: "Career",
  PHOTOGRAPHY: "Photography",
  LEARNING: "Learning",
  TRAVEL: "Travel",
  WRITING: "Writing",
  PERSONAL: "Personal",
  CREATIVE: "Creative",
  RESEARCH: "Research",
  OTHER: "Other",
};

export const IDEA_STATUS_LABELS: Record<IdeaStatusValue, string> = {
  NEW: "New",
  THINKING: "Thinking",
  EXPLORING: "Exploring",
  BUILDING: "Building",
  ARCHIVED: "Archived",
};

export const DEFAULT_IDEA_STATUS: IdeaStatusValue = "NEW";

// Same limits as Learning Journey themes so tags stay interchangeable.
export const MAX_IDEA_TAGS = 12;
export const MAX_IDEA_TAG_LENGTH = 40;

export type SerializedIdea = {
  id: string;
  title: string;
  content: string;
  category: IdeaCategoryValue | null;
  categoryLabel: string | null;
  status: IdeaStatusValue;
  statusLabel: string;
  tags: string[];
  notes: string | null;
  ideaDate: string;
  ideaDateLabel: string;
  createdAt: string;
};

export type IdeasPageData = {
  ideas: SerializedIdea[];
  defaultIdeaDate: string;
  userTimezone: string;
};

export type CreateIdeaInput = {
  content?: string | null;
  title?: string | null;
  category?: IdeaCategoryValue | null;
  status?: IdeaStatusValue | null;
  tags?: string[];
  notes?: string | null;
  ideaDate?: string | null;
};

export type UpdateIdeaInput = CreateIdeaInput;

export function isIdeaCategory(
  value: string | null | undefined,
): value is IdeaCategoryValue {
  return Boolean(value && IDEA_CATEGORIES.includes(value as IdeaCategoryValue));
}

export function isIdeaStatus(
  value: string | null | undefined,
): value is IdeaStatusValue {
  return Boolean(value && IDEA_STATUSES.includes(value as IdeaStatusValue));
}

function normalizeIdeaTagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

export function normalizeIdeaTags(tags: string[] | null | undefined): string[] {
  if (!tags?.length) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.trim().slice(0, MAX_IDEA_TAG_LENGTH);
    if (!tag) {
      continue;
    }

    const key = normalizeIdeaTagKey(tag);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(tag);

    if (normalized.length >= MAX_IDEA_TAGS) {
      break;
    }
  }

  return normalized;
}

export function parseIdeaTagsInput(value: string): string[] {
  return normalizeIdeaTags(value.split(","));
}
