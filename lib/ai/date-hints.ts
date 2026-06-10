import { addDays, format, getDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { APP_TIMEZONE } from "@/config/time";
import { isValidDateString } from "@/lib/dates";

export type DateHintConfidence = "LOW" | "MEDIUM" | "HIGH";

export type ResolvedDateHint = {
  dateString?: string;
  confidence: DateHintConfidence;
  explanation?: string;
};

const ENGLISH_MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const ENGLISH_WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const PERSIAN_WEEKDAYS: Record<string, number> = {
  "شنبه": 6,
  "یکشنبه": 0,
  "دوشنبه": 1,
  "سه‌شنبه": 2,
  "سه شنبه": 2,
  "چهارشنبه": 3,
  "چهار شنبه": 3,
  "پنجشنبه": 4,
  "پنج شنبه": 4,
  "جمعه": 5,
};

const PERSIAN_RELATIVE: Record<string, number> = {
  "امروز": 0,
  "فردا": 1,
  "پس‌فردا": 2,
  "پس فردا": 2,
};

const ENGLISH_RELATIVE: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  "day after tomorrow": 2,
};

function normalizeText(rawText: string): string {
  return rawText
    .trim()
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ");
}

function lowerConfidence(
  current: DateHintConfidence,
  next: DateHintConfidence,
): DateHintConfidence {
  const order: Record<DateHintConfidence, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
  };

  return order[current] <= order[next] ? current : next;
}

function zonedToday(now: Date, timezone: string): Date {
  return toZonedTime(now, timezone);
}

function addDaysInTimezone(
  now: Date,
  timezone: string,
  days: number,
): string {
  const zoned = zonedToday(now, timezone);
  return format(addDays(zoned, days), "yyyy-MM-dd");
}

function isPlausibleCalendarDate(year: number, month: number, day: number): boolean {
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function resolveYearlessMonthDay(
  month: number,
  day: number,
  now: Date,
  timezone: string,
): ResolvedDateHint {
  const zonedNow = zonedToday(now, timezone);
  const currentYear = zonedNow.getFullYear();

  const candidates = [
    { year: currentYear, confidence: "HIGH" as const },
    { year: currentYear - 1, confidence: "MEDIUM" as const },
    { year: currentYear + 1, confidence: "MEDIUM" as const },
  ];

  let best: ResolvedDateHint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!isPlausibleCalendarDate(candidate.year, month, day)) {
      continue;
    }

    const date = new Date(candidate.year, month - 1, day);
    const distanceDays = Math.abs(
      (date.getTime() - zonedNow.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (distanceDays < bestDistance) {
      bestDistance = distanceDays;
      best = {
        dateString: format(date, "yyyy-MM-dd"),
        confidence:
          distanceDays > 183 ? lowerConfidence(candidate.confidence, "MEDIUM") : candidate.confidence,
        explanation:
          candidate.year === currentYear
            ? "Resolved using the current year."
            : `Resolved using ${candidate.year} as the nearest plausible year.`,
      };
    }
  }

  return (
    best ?? {
      confidence: "LOW",
      explanation: "Month and day were visible, but the year could not be resolved.",
    }
  );
}

function nearestWeekday(
  weekday: number,
  now: Date,
  timezone: string,
): ResolvedDateHint {
  const zonedNow = zonedToday(now, timezone);
  let bestDate: Date | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let offset = -3; offset <= 3; offset += 1) {
    const candidate = addDays(zonedNow, offset);
    if (getDay(candidate) !== weekday) {
      continue;
    }

    const distance = Math.abs(offset);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDate = candidate;
    }
  }

  if (!bestDate) {
    return {
      confidence: "LOW",
      explanation: "Weekday name was visible, but no nearby match was found.",
    };
  }

  let confidence: DateHintConfidence = "LOW";
  if (bestDistance === 0) {
    confidence = "HIGH";
  } else if (bestDistance <= 1) {
    confidence = "MEDIUM";
  }

  return {
    dateString: format(bestDate, "yyyy-MM-dd"),
    confidence,
    explanation:
      bestDistance === 0
        ? "Matched the weekday to today."
        : `Matched the weekday to the nearest day within ${bestDistance} day(s).`,
  };
}

function tryIsoDate(text: string): ResolvedDateHint | null {
  const match = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!match) return null;

  const dateString = `${match[1]}-${match[2]}-${match[3]}`;
  if (!isValidDateString(dateString)) return null;

  return {
    dateString,
    confidence: "HIGH",
    explanation: "Matched an ISO date.",
  };
}

function trySlashDate(text: string): ResolvedDateHint | null {
  const match = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (!isPlausibleCalendarDate(year, month, day)) return null;

  return {
    dateString: format(new Date(year, month - 1, day), "yyyy-MM-dd"),
    confidence: "HIGH",
    explanation: "Matched a numeric slash date.",
  };
}

function tryRelativeDate(
  text: string,
  now: Date,
  timezone: string,
): ResolvedDateHint | null {
  const normalized = normalizeText(text).toLowerCase();

  for (const [word, offset] of Object.entries(ENGLISH_RELATIVE)) {
    if (normalized === word || normalized.includes(word)) {
      return {
        dateString: addDaysInTimezone(now, timezone, offset),
        confidence: "HIGH",
        explanation: `Matched relative date: ${word}.`,
      };
    }
  }

  const persian = normalizeText(text);
  for (const [word, offset] of Object.entries(PERSIAN_RELATIVE)) {
    if (persian === word || persian.includes(word)) {
      return {
        dateString: addDaysInTimezone(now, timezone, offset),
        confidence: "HIGH",
        explanation: `Matched relative date: ${word}.`,
      };
    }
  }

  return null;
}

function tryMonthDayDate(
  text: string,
  now: Date,
  timezone: string,
): ResolvedDateHint | null {
  const dayMonthYear = text.match(
    /\b(\d{1,2})\s+([A-Za-z]+)(?:,?\s+(\d{4}))?\b/i,
  );
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = ENGLISH_MONTHS[dayMonthYear[2].toLowerCase()];
    if (month) {
      if (dayMonthYear[3]) {
        const year = Number(dayMonthYear[3]);
        if (isPlausibleCalendarDate(year, month, day)) {
          return {
            dateString: format(new Date(year, month - 1, day), "yyyy-MM-dd"),
            confidence: "HIGH",
            explanation: "Matched a day-month-year date.",
          };
        }
      }
      return resolveYearlessMonthDay(month, day, now, timezone);
    }
  }

  const monthDayYear = text.match(
    /\b([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i,
  );
  if (monthDayYear) {
    const month = ENGLISH_MONTHS[monthDayYear[1].toLowerCase()];
    const day = Number(monthDayYear[2]);
    if (month) {
      if (monthDayYear[3]) {
        const year = Number(monthDayYear[3]);
        if (isPlausibleCalendarDate(year, month, day)) {
          return {
            dateString: format(new Date(year, month - 1, day), "yyyy-MM-dd"),
            confidence: "HIGH",
            explanation: "Matched a month-day-year date.",
          };
        }
      }
      return resolveYearlessMonthDay(month, day, now, timezone);
    }
  }

  return null;
}

function textContainsPersianWeekday(text: string, name: string): boolean {
  if (text === name) {
    return true;
  }

  if (text.startsWith(`${name} `) || text.endsWith(` ${name}`) || text.endsWith(name)) {
    return true;
  }

  return text.includes(` ${name} `);
}

function tryWeekdayDate(
  text: string,
  now: Date,
  timezone: string,
): ResolvedDateHint | null {
  const normalized = normalizeText(text).toLowerCase();

  for (const [name, weekday] of Object.entries(ENGLISH_WEEKDAYS)) {
    const pattern = new RegExp(`\\b${name}\\b`, "i");
    if (pattern.test(normalized)) {
      const resolved = nearestWeekday(weekday, now, timezone);
      return {
        ...resolved,
        explanation: `Matched weekday: ${name}. ${resolved.explanation ?? ""}`.trim(),
      };
    }
  }

  const persian = normalizeText(text);
  const persianNames = Object.keys(PERSIAN_WEEKDAYS).sort(
    (left, right) => right.length - left.length,
  );

  for (const name of persianNames) {
    if (textContainsPersianWeekday(persian, name)) {
      const weekday = PERSIAN_WEEKDAYS[name];
      const resolved = nearestWeekday(weekday, now, timezone);
      return {
        ...resolved,
        explanation: `Matched Persian weekday: ${name}. ${resolved.explanation ?? ""}`.trim(),
      };
    }
  }

  return null;
}

export function resolveDateHint(
  rawText: string,
  now = new Date(),
  timezone = APP_TIMEZONE,
): ResolvedDateHint {
  const text = normalizeText(rawText);

  if (!text) {
    return { confidence: "LOW" };
  }

  const resolvers = [
    () => tryIsoDate(text),
    () => trySlashDate(text),
    () => tryRelativeDate(text, now, timezone),
    () => tryMonthDayDate(text, now, timezone),
    () => tryWeekdayDate(text, now, timezone),
  ];

  for (const resolver of resolvers) {
    const result = resolver();
    if (result?.dateString) {
      return result;
    }
  }

  return {
    confidence: "LOW",
    explanation: "Visible date text could not be resolved to a calendar day.",
  };
}

export function mergeDateHintConfidence(
  modelConfidence: DateHintConfidence | undefined,
  resolvedConfidence: DateHintConfidence,
): DateHintConfidence {
  if (!modelConfidence) {
    return resolvedConfidence;
  }

  return lowerConfidence(modelConfidence, resolvedConfidence);
}

export function formatDetectedDateLabel(
  dateString: string,
  timezone = APP_TIMEZONE,
): string {
  if (!isValidDateString(dateString)) {
    return dateString;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}
