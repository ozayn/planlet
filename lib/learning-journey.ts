import type { LearningEntry } from "@/app/generated/prisma/client";
import {
  formatDateStringInTimezone,
  getTodayDateString,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  LEARNING_CATEGORY_LABELS,
  LEARNING_SOURCE_TYPE_LABELS,
  type CreateLearningEntryInput,
  type LearningCategoryValue,
  type LearningJourneyPageData,
  type LearningSourceTypeValue,
  type SerializedLearningEntry,
  type UpdateLearningEntryInput,
  isLearningCategory,
  isLearningSourceType,
  parseLearningEntryTags,
} from "@/lib/learning-journey/constants";
import { prisma } from "@/lib/prisma";
import { canUseLearningJourneyFeatures, type UserAccess } from "@/lib/roles";
import { getUserTimezone } from "@/lib/user-timezone";

export type {
  CreateLearningEntryInput,
  LearningCategoryValue,
  LearningJourneyPageData,
  LearningSourceTypeValue,
  SerializedLearningEntry,
  UpdateLearningEntryInput,
} from "@/lib/learning-journey/constants";

export {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_LABELS,
  LEARNING_SOURCE_TYPE_LABELS,
  LEARNING_SOURCE_TYPES,
  formatLearningEntryTags,
  formatLearningImportanceLabel,
  isLearningCategory,
  isLearningSourceType,
  parseLearningEntryTags,
} from "@/lib/learning-journey/constants";

export class LearningJourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningJourneyError";
  }
}

const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 8000;
const MAX_NOTES_LENGTH = 4000;
const MAX_SOURCE_NAME_LENGTH = 200;

function clampImportance(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function deriveTitleFromFields(
  title: string | null | undefined,
  summary: string,
  notes: string | null,
): string {
  const explicit = title?.trim();
  if (explicit) {
    return explicit.slice(0, MAX_TITLE_LENGTH);
  }

  const summaryLine = summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (summaryLine) {
    if (summaryLine.length <= MAX_TITLE_LENGTH) {
      return summaryLine;
    }

    return `${summaryLine.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
  }

  const notesLine = notes
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (notesLine) {
    if (notesLine.length <= MAX_TITLE_LENGTH) {
      return notesLine;
    }

    return `${notesLine.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
  }

  throw new LearningJourneyError("Add a title, summary, or notes.");
}

function deriveSummaryFromFields(
  summary: string | null | undefined,
  title: string,
  notes: string | null,
): string {
  const explicit = summary?.trim();
  if (explicit) {
    if (explicit.length > MAX_SUMMARY_LENGTH) {
      throw new LearningJourneyError("Learning entry is too long.");
    }

    return explicit;
  }

  if (notes?.trim()) {
    return notes.trim().slice(0, MAX_SUMMARY_LENGTH);
  }

  if (title.trim()) {
    return title.trim().slice(0, MAX_SUMMARY_LENGTH);
  }

  throw new LearningJourneyError("Add a title, summary, or notes.");
}

function parseLearningEntryFields(
  input: {
    title?: string | null;
    summary?: string | null;
    sourceType?: LearningSourceTypeValue | null;
    sourceName?: string | null;
    category?: LearningCategoryValue | null;
    learnedAt?: string | null;
    notes?: string | null;
    importance?: number | null;
    tags?: string | null;
  },
  timezone: string,
  options: { requireAnyContent: boolean },
) {
  const rawTitle = input.title?.trim() ?? "";
  const rawSummary = input.summary?.trim() ?? "";
  const rawNotes = input.notes?.trim() ?? "";

  if (options.requireAnyContent && !rawTitle && !rawSummary && !rawNotes) {
    throw new LearningJourneyError("Add a title, summary, or notes.");
  }

  const title = deriveTitleFromFields(rawTitle, rawSummary, rawNotes || null);
  const summary = deriveSummaryFromFields(rawSummary, title, rawNotes || null);

  if (summary.length > MAX_SUMMARY_LENGTH) {
    throw new LearningJourneyError("Learning entry is too long.");
  }

  if (input.sourceType && !isLearningSourceType(input.sourceType)) {
    throw new LearningJourneyError("Invalid source type.");
  }

  if (input.category && !isLearningCategory(input.category)) {
    throw new LearningJourneyError("Invalid category.");
  }

  const sourceName =
    input.sourceName?.trim().slice(0, MAX_SOURCE_NAME_LENGTH) ?? null;
  const notes = rawNotes ? rawNotes.slice(0, MAX_NOTES_LENGTH) : null;
  const importance = clampImportance(input.importance ?? 3);

  let learnedAtString = input.learnedAt?.trim();
  if (!learnedAtString) {
    learnedAtString = getTodayDateString(timezone);
  }

  if (!isValidDateString(learnedAtString)) {
    throw new LearningJourneyError("Invalid date.");
  }

  return {
    title,
    summary,
    sourceType: input.sourceType ?? null,
    sourceName,
    category: input.category ?? null,
    learnedAt: parseDateString(learnedAtString),
    notes,
    importance,
    tags: parseLearningEntryTags(input.tags),
  };
}

function formatLearnedAtLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function serializeLearningEntry(
  entry: LearningEntry,
  timezone: string,
): SerializedLearningEntry {
  const sourceType = entry.sourceType as LearningSourceTypeValue | null;
  const category = entry.category as LearningCategoryValue | null;

  return {
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    sourceType,
    sourceTypeLabel: sourceType
      ? LEARNING_SOURCE_TYPE_LABELS[sourceType]
      : null,
    sourceName: entry.sourceName,
    category,
    categoryLabel: category ? LEARNING_CATEGORY_LABELS[category] : null,
    learnedAt: formatDateStringInTimezone(entry.learnedAt, timezone),
    learnedAtLabel: formatLearnedAtLabel(entry.learnedAt, timezone),
    notes: entry.notes,
    importance: entry.importance,
    tags: entry.tags,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function validateCreateLearningEntryInput(
  input: CreateLearningEntryInput,
  timezone: string,
): {
  title: string;
  summary: string;
  sourceType: LearningSourceTypeValue | null;
  sourceName: string | null;
  category: LearningCategoryValue | null;
  learnedAt: Date;
  notes: string | null;
  importance: number;
  tags: string[];
} {
  const summary = input.summary?.trim();

  if (!summary) {
    throw new LearningJourneyError("What did you learn?");
  }

  return parseLearningEntryFields(
    {
      ...input,
      summary,
      title: input.title,
    },
    timezone,
    { requireAnyContent: false },
  );
}

export function validateUpdateLearningEntryInput(
  input: UpdateLearningEntryInput,
  timezone: string,
): {
  title: string;
  summary: string;
  sourceType: LearningSourceTypeValue | null;
  sourceName: string | null;
  category: LearningCategoryValue | null;
  learnedAt: Date;
  notes: string | null;
  importance: number;
  tags: string[];
} {
  return parseLearningEntryFields(input, timezone, { requireAnyContent: true });
}

export async function getLearningJourneyPageData(
  userId: string,
): Promise<LearningJourneyPageData> {
  const timezone = await getUserTimezone(userId);
  const entries = await prisma.learningEntry.findMany({
    where: { userId },
    orderBy: [{ learnedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return {
    entries: entries.map((entry) => serializeLearningEntry(entry, timezone)),
    defaultLearnedAt: getTodayDateString(timezone),
    userTimezone: timezone,
  };
}

export async function createLearningEntry(
  userId: string,
  input: CreateLearningEntryInput,
): Promise<SerializedLearningEntry> {
  const timezone = await getUserTimezone(userId);
  const data = validateCreateLearningEntryInput(input, timezone);

  const entry = await prisma.learningEntry.create({
    data: {
      userId,
      ...data,
    },
  });

  return serializeLearningEntry(entry, timezone);
}

export async function updateLearningEntry(
  userId: string,
  entryId: string,
  input: UpdateLearningEntryInput,
): Promise<SerializedLearningEntry> {
  const existing = await prisma.learningEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new LearningJourneyError("Learning entry not found.");
  }

  const timezone = await getUserTimezone(userId);
  const data = validateUpdateLearningEntryInput(input, timezone);

  const entry = await prisma.learningEntry.update({
    where: { id: entryId },
    data,
  });

  return serializeLearningEntry(entry, timezone);
}

export async function deleteLearningEntry(
  userId: string,
  entryId: string,
): Promise<void> {
  const existing = await prisma.learningEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new LearningJourneyError("Learning entry not found.");
  }

  await prisma.learningEntry.delete({
    where: { id: entryId },
  });
}

export function requireLearningJourneyAccess(access: UserAccess): void {
  if (!canUseLearningJourneyFeatures(access)) {
    throw new LearningJourneyError("Not authorized.");
  }
}
