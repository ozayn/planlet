import { endOfWeek, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { formatDateStringInTimezone, parseDateString } from "@/lib/dates";
import {
  MEANINGFUL_IMPORTANCE_MIN,
  type SerializedLearningEntry,
} from "@/lib/learning-journey/constants";

const WEEK_STARTS_ON = 1 as const;

export type LearningEntryFilter = "all" | "meaningful" | "this-week" | "this-month";

export const LEARNING_ENTRY_FILTERS: {
  value: LearningEntryFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "meaningful", label: "Favorites / Meaningful" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
];

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function entrySearchText(entry: SerializedLearningEntry): string {
  return [
    entry.title,
    entry.summary,
    entry.notes,
    entry.sourceTypeLabel,
    entry.sourceName,
    entry.categoryLabel,
    ...entry.themes,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function matchesLearningEntrySearch(
  entry: SerializedLearningEntry,
  query: string,
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return true;
  }

  return entrySearchText(entry).includes(normalized);
}

export function isMeaningfulLearningEntry(entry: SerializedLearningEntry): boolean {
  return entry.importance >= MEANINGFUL_IMPORTANCE_MIN;
}

function weekStartKey(date: Date, timezone: string): string {
  const zoned = toZonedTime(date, timezone);
  const weekStart = startOfWeek(zoned, { weekStartsOn: WEEK_STARTS_ON });
  return formatDateStringInTimezone(weekStart, timezone);
}

export function isLearningEntryInCurrentWeek(
  learnedAt: string,
  timezone: string,
  now = new Date(),
): boolean {
  const entryWeekStart = weekStartKey(parseDateString(learnedAt), timezone);
  const currentWeekStart = weekStartKey(now, timezone);
  return entryWeekStart === currentWeekStart;
}

export function isLearningEntryInCurrentMonth(
  learnedAt: string,
  timezone: string,
  now = new Date(),
): boolean {
  const entryMonth = learnedAt.slice(0, 7);
  const currentMonth = formatDateStringInTimezone(now, timezone).slice(0, 7);
  return entryMonth === currentMonth;
}

export function filterLearningEntries(
  entries: SerializedLearningEntry[],
  options: {
    query?: string;
    filter?: LearningEntryFilter;
    timezone: string;
    now?: Date;
  },
): SerializedLearningEntry[] {
  const query = options.query ?? "";
  const filter = options.filter ?? "all";
  const now = options.now ?? new Date();

  return entries.filter((entry) => {
    if (!matchesLearningEntrySearch(entry, query)) {
      return false;
    }

    switch (filter) {
      case "meaningful":
        return isMeaningfulLearningEntry(entry);
      case "this-week":
        return isLearningEntryInCurrentWeek(entry.learnedAt, options.timezone, now);
      case "this-month":
        return isLearningEntryInCurrentMonth(entry.learnedAt, options.timezone, now);
      case "all":
      default:
        return true;
    }
  });
}
