import type { Idea } from "@/app/generated/prisma/client";
import {
  formatDateStringInTimezone,
  getTodayDateString,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  DEFAULT_IDEA_STATUS,
  IDEA_CATEGORY_LABELS,
  IDEA_STATUS_LABELS,
  isIdeaCategory,
  isIdeaStatus,
  normalizeIdeaTags,
  type CreateIdeaInput,
  type IdeaCategoryValue,
  type IdeasPageData,
  type IdeaStatusValue,
  type SerializedIdea,
  type UpdateIdeaInput,
} from "@/lib/ideas/constants";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/user-timezone";

export type {
  CreateIdeaInput,
  IdeaCategoryValue,
  IdeasPageData,
  IdeaStatusValue,
  SerializedIdea,
  UpdateIdeaInput,
} from "@/lib/ideas/constants";

export {
  DEFAULT_IDEA_STATUS,
  IDEA_CATEGORIES,
  IDEA_CATEGORY_LABELS,
  IDEA_STATUS_LABELS,
  IDEA_STATUSES,
  isIdeaCategory,
  isIdeaStatus,
  normalizeIdeaTags,
  parseIdeaTagsInput,
} from "@/lib/ideas/constants";

export {
  filterIdeas,
  IDEA_FILTERS,
  matchesIdeaSearch,
  type IdeaFilter,
} from "@/lib/ideas/search";

export class IdeasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdeasError";
  }
}

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 8000;
const MAX_NOTES_LENGTH = 4000;
const DERIVED_TITLE_MAX_LENGTH = 80;

function truncateDerivedTitle(text: string): string {
  if (text.length <= DERIVED_TITLE_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, DERIVED_TITLE_MAX_LENGTH - 1).trim()}…`;
}

export function firstSentenceForIdeaTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const firstLine =
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? trimmed;

  const sentenceMatch = firstLine.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  return firstLine;
}

function deriveTitleFromFields(
  title: string | null,
  content: string,
  notes: string | null,
): string {
  const explicit = title?.trim();
  if (explicit) {
    return explicit.slice(0, MAX_TITLE_LENGTH);
  }

  const fromContent = content.trim()
    ? truncateDerivedTitle(firstSentenceForIdeaTitle(content))
    : "";
  if (fromContent) {
    return fromContent.slice(0, MAX_TITLE_LENGTH);
  }

  const fromNotes = notes?.trim()
    ? truncateDerivedTitle(firstSentenceForIdeaTitle(notes))
    : "";
  if (fromNotes) {
    return fromNotes.slice(0, MAX_TITLE_LENGTH);
  }

  throw new IdeasError("Add an idea, title, or notes.");
}

function deriveContentFromFields(
  content: string | null,
  title: string,
  notes: string | null,
): string {
  const explicit = content?.trim();
  if (explicit) {
    if (explicit.length > MAX_CONTENT_LENGTH) {
      throw new IdeasError("Idea is too long.");
    }

    return explicit;
  }

  if (notes?.trim()) {
    return notes.trim().slice(0, MAX_CONTENT_LENGTH);
  }

  if (title.trim()) {
    return title.trim().slice(0, MAX_CONTENT_LENGTH);
  }

  throw new IdeasError("Add an idea, title, or notes.");
}

function parseIdeaFields(
  input: CreateIdeaInput | UpdateIdeaInput,
  timezone: string,
): {
  title: string;
  content: string;
  category: IdeaCategoryValue | null;
  status: IdeaStatusValue;
  tags: string[];
  notes: string | null;
  ideaDate: Date;
} {
  const rawTitle = input.title?.trim() ?? "";
  const rawContent = input.content?.trim() ?? "";
  const rawNotes = input.notes?.trim() ?? "";

  if (!rawTitle && !rawContent && !rawNotes) {
    throw new IdeasError("Add an idea, title, or notes.");
  }

  const title = deriveTitleFromFields(rawTitle || null, rawContent, rawNotes || null);
  const content = deriveContentFromFields(rawContent || null, title, rawNotes || null);

  if (input.category && !isIdeaCategory(input.category)) {
    throw new IdeasError("Invalid category.");
  }

  if (input.status && !isIdeaStatus(input.status)) {
    throw new IdeasError("Invalid status.");
  }

  const notes = rawNotes ? rawNotes.slice(0, MAX_NOTES_LENGTH) : null;

  let ideaDateString = input.ideaDate?.trim();
  if (!ideaDateString) {
    ideaDateString = getTodayDateString(timezone);
  }

  if (!isValidDateString(ideaDateString)) {
    throw new IdeasError("Invalid date.");
  }

  return {
    title,
    content,
    category: input.category ?? null,
    status: input.status ?? DEFAULT_IDEA_STATUS,
    tags: normalizeIdeaTags(input.tags),
    notes,
    ideaDate: parseDateString(ideaDateString),
  };
}

export function validateCreateIdeaInput(
  input: CreateIdeaInput,
  timezone: string,
): ReturnType<typeof parseIdeaFields> {
  return parseIdeaFields(input, timezone);
}

export function validateUpdateIdeaInput(
  input: UpdateIdeaInput,
  timezone: string,
): ReturnType<typeof parseIdeaFields> {
  return parseIdeaFields(input, timezone);
}

function formatIdeaDateLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function serializeIdea(idea: Idea, timezone: string): SerializedIdea {
  const category = idea.category as IdeaCategoryValue | null;
  const status = idea.status as IdeaStatusValue;

  return {
    id: idea.id,
    title: idea.title,
    content: idea.content,
    category,
    categoryLabel: category ? IDEA_CATEGORY_LABELS[category] : null,
    status,
    statusLabel: IDEA_STATUS_LABELS[status],
    tags: idea.tags,
    notes: idea.notes,
    ideaDate: formatDateStringInTimezone(idea.ideaDate, timezone),
    ideaDateLabel: formatIdeaDateLabel(idea.ideaDate, timezone),
    createdAt: idea.createdAt.toISOString(),
  };
}

export async function getIdeasPageData(userId: string): Promise<IdeasPageData> {
  const timezone = await getUserTimezone(userId);
  const ideas = await prisma.idea.findMany({
    where: { userId },
    orderBy: [{ ideaDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return {
    ideas: ideas.map((idea) => serializeIdea(idea, timezone)),
    defaultIdeaDate: getTodayDateString(timezone),
    userTimezone: timezone,
  };
}

export async function createIdea(
  userId: string,
  input: CreateIdeaInput,
): Promise<SerializedIdea> {
  const timezone = await getUserTimezone(userId);
  const data = validateCreateIdeaInput(input, timezone);

  const idea = await prisma.idea.create({
    data: {
      userId,
      ...data,
    },
  });

  return serializeIdea(idea, timezone);
}

export async function updateIdea(
  userId: string,
  ideaId: string,
  input: UpdateIdeaInput,
): Promise<SerializedIdea> {
  const existing = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new IdeasError("Idea not found.");
  }

  const timezone = await getUserTimezone(userId);
  const data = validateUpdateIdeaInput(input, timezone);

  const idea = await prisma.idea.update({
    where: { id: ideaId },
    data,
  });

  return serializeIdea(idea, timezone);
}

export async function deleteIdea(userId: string, ideaId: string): Promise<void> {
  const existing = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new IdeasError("Idea not found.");
  }

  await prisma.idea.delete({
    where: { id: ideaId },
  });
}
