import type {
  PlanItemStatus,
  PlanItemType,
  PlanLanguage,
} from "@/app/generated/prisma/client";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { APP_TIMEZONE } from "@/config/time";
import { ENGLISH_MONTHS, resolveDateHint } from "@/lib/ai/date-hints";
import type { ParsedPlan } from "@/lib/ai/plan-parser-schema";
import { isGenericPlanHeaderTitle } from "@/lib/plan-titles";

export const MESSY_PLAN_MIN_ITEMS = 2;

export type MessyPlanDraftItem = {
  title: string;
  type: PlanItemType;
  status?: PlanItemStatus;
};

export type MessyPlanDraft = {
  date?: string;
  detectedTitle?: string;
  items: MessyPlanDraftItem[];
};

export type ParseMessyPlanTextOptions = {
  fallbackDate?: string;
  now?: Date;
  timezone?: string;
};

const SECTION_HEADING_TO_TYPE: Record<string, PlanItemType> = {
  tasks: "TASK",
  task: "TASK",
  intentions: "INTENTION",
  intention: "INTENTION",
  notes: "NOTE",
  note: "NOTE",
  events: "EVENT",
  event: "EVENT",
  "work blocks": "WORK_BLOCK",
  "work block": "WORK_BLOCK",
  errands: "ERRAND",
  errand: "ERRAND",
  social: "SOCIAL",
  rest: "REST",
};

const LEADING_STATUS_MARKERS: Array<{
  pattern: RegExp;
  status: PlanItemStatus;
}> = [
  { pattern: /^✅\s*|^☑\s*|^✓\s*/u, status: "DONE" },
  { pattern: /^❌\s*/u, status: "NOT_DONE" },
  { pattern: /^◐\s*|^◑\s*/u, status: "PARTIAL" },
  { pattern: /^↪️?\s*|^🔁\s*|^↪\s*/u, status: "MOVED" },
  { pattern: /^🕊️?\s*|^🍃\s*/u, status: "RELEASED" },
  { pattern: /^☐\s*|^□\s*|^▢\s*/u, status: "OPEN" },
];

const BULLET_PREFIX_PATTERN =
  /^(\s*[-–—•*]|\s*\d+[\.\):]|\s*[\(\[]\s*[x✓]?\s*[\)\]])\s*/iu;

const EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;

function stripEmojis(text: string): string {
  return text.replace(EMOJI_PATTERN, "").replace(/\s+/g, " ").trim();
}

function isPlausibleCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function resolveImportYear(
  month: number,
  now: Date,
  timezone: string,
): number {
  const zoned = toZonedTime(now, timezone);
  const currentYear = zoned.getFullYear();
  const currentMonth = zoned.getMonth() + 1;

  if (currentMonth === 12 && (month === 1 || month === 2)) {
    return currentYear + 1;
  }

  return currentYear;
}

function formatYearMonthDay(
  year: number,
  month: number,
  day: number,
): string | undefined {
  if (!isPlausibleCalendarDate(year, month, day)) {
    return undefined;
  }

  return format(new Date(year, month - 1, day), "yyyy-MM-dd");
}

function reapplyImportYear(
  dateString: string,
  sourceLine: string,
  now: Date,
  timezone: string,
): string {
  if (/\b\d{4}\b/.test(sourceLine)) {
    return dateString;
  }

  const [, month, day] = dateString.split("-").map(Number);
  const year = resolveImportYear(month, now, timezone);
  return formatYearMonthDay(year, month, day) ?? dateString;
}

export function resolveMessyPlanDate(
  line: string,
  now = new Date(),
  timezone = APP_TIMEZONE,
): string | undefined {
  const text = stripEmojis(line).trim();

  if (!text) {
    return undefined;
  }

  if (/\b\d{4}\b/.test(text) || /\b\d{4}-\d{2}-\d{2}\b/.test(text)) {
    const hint = resolveDateHint(text, now, timezone);
    return hint.dateString;
  }

  const monthDay = text.match(
    /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  if (monthDay) {
    const month = ENGLISH_MONTHS[monthDay[1].toLowerCase()];
    const day = Number(monthDay[2]);
    if (month) {
      const year = resolveImportYear(month, now, timezone);
      return formatYearMonthDay(year, month, day);
    }
  }

  const dayMonth = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\b/i,
  );
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = ENGLISH_MONTHS[dayMonth[2].toLowerCase()];
    if (month) {
      const year = resolveImportYear(month, now, timezone);
      return formatYearMonthDay(year, month, day);
    }
  }

  const hint = resolveDateHint(text, now, timezone);
  if (hint.dateString && hint.confidence !== "LOW") {
    return reapplyImportYear(hint.dateString, text, now, timezone);
  }

  return undefined;
}

function parseSectionHeading(line: string): PlanItemType | null {
  const normalized = line
    .trim()
    .replace(/[:\-#]+$/u, "")
    .trim()
    .toLowerCase();

  return SECTION_HEADING_TO_TYPE[normalized] ?? null;
}

function isDateHeadingLine(
  line: string,
  now: Date,
  timezone: string,
): boolean {
  if (parseSectionHeading(line)) {
    return false;
  }

  const parsed = parseMessyPlanItemLine(line);
  if (parsed && parsed.title.length > 0 && !resolveMessyPlanDate(line, now, timezone)) {
    return false;
  }

  return Boolean(resolveMessyPlanDate(line, now, timezone));
}

function parseLeadingStatus(line: string): {
  status?: PlanItemStatus;
  remainder: string;
} {
  let remainder = line.trim();

  for (const marker of LEADING_STATUS_MARKERS) {
    if (marker.pattern.test(remainder)) {
      remainder = remainder.replace(marker.pattern, "").trim();
      return { status: marker.status, remainder };
    }
  }

  return { remainder };
}

export function parseMessyPlanItemLine(
  line: string,
): { title: string; status?: PlanItemStatus } | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const { status, remainder } = parseLeadingStatus(trimmed);
  let title = remainder.replace(BULLET_PREFIX_PATTERN, "").trim();
  title = stripEmojis(title);

  if (!title) {
    return null;
  }

  return { title, status };
}

function detectPlanLanguage(items: MessyPlanDraftItem[]): PlanLanguage {
  const text = items.map((item) => item.title).join(" ");
  const hasPersian = /[\u0600-\u06FF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);

  if (hasPersian && hasLatin) {
    return "MIXED";
  }

  if (hasPersian) {
    return "FA";
  }

  if (hasLatin) {
    return "EN";
  }

  return "UNKNOWN";
}

export function messyPlanDraftToParsedPlan(
  draft: MessyPlanDraft,
  planType: ParsedPlan["planType"] = "DAY",
): ParsedPlan {
  const detectedTitle = draft.detectedTitle?.trim();
  const title =
    detectedTitle &&
    !isGenericPlanHeaderTitle(detectedTitle) &&
    detectedTitle.length > 0
      ? detectedTitle
      : "Imported plan";

  return {
    title,
    planType,
    language: detectPlanLanguage(draft.items),
    items: draft.items.map((item) => ({
      title: item.title,
      type: item.type,
      ...(item.status ? { status: item.status } : {}),
    })),
  };
}

export function parseMessyPlanText(
  input: string,
  options: ParseMessyPlanTextOptions = {},
): MessyPlanDraft {
  const now = options.now ?? new Date();
  const timezone = options.timezone ?? APP_TIMEZONE;
  const lines = input.split(/\r?\n/);

  let currentType: PlanItemType = "TASK";
  let date = options.fallbackDate;
  let detectedTitle: string | undefined;
  const items: MessyPlanDraftItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const sectionType = parseSectionHeading(line);
    if (sectionType) {
      currentType = sectionType;
      continue;
    }

    if (isDateHeadingLine(line, now, timezone)) {
      const resolved = resolveMessyPlanDate(line, now, timezone);
      if (resolved) {
        date = resolved;
      }
      if (!detectedTitle) {
        detectedTitle = stripEmojis(line);
      }
      continue;
    }

    const parsed = parseMessyPlanItemLine(line);
    if (!parsed) {
      continue;
    }

    items.push({
      title: parsed.title,
      type: currentType,
      ...(parsed.status ? { status: parsed.status } : {}),
    });
  }

  return {
    date,
    detectedTitle,
    items,
  };
}

export function shouldUseMessyPlanParser(draft: MessyPlanDraft): boolean {
  return draft.items.length >= MESSY_PLAN_MIN_ITEMS;
}
