import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import type { PlanType } from "@/app/generated/prisma/client";
import { APP_TIMEZONE } from "@/config/time";

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_STARTS_ON = 1 as const;

/**
 * Planlet stores DateTime values in UTC (PostgreSQL timestamptz / Prisma DateTime).
 * Range boundaries below are computed in APP_TIMEZONE, then converted to UTC Dates
 * for storage and queries.
 */

export type DateRange = {
  start: Date;
  end: Date;
};

function toUtcRangeStart(zonedDate: Date): Date {
  return fromZonedTime(zonedDate, APP_TIMEZONE);
}

function toUtcRangeEnd(zonedDate: Date): Date {
  return fromZonedTime(zonedDate, APP_TIMEZONE);
}

function zonedDate(date: Date): Date {
  return toZonedTime(date, APP_TIMEZONE);
}

export function getDayRange(date: Date): DateRange {
  const zoned = zonedDate(date);
  return {
    start: toUtcRangeStart(startOfDay(zoned)),
    end: toUtcRangeEnd(endOfDay(zoned)),
  };
}

export function getTodayRange(now = new Date()): DateRange {
  return getDayRange(now);
}

export function isValidDateString(dateString: string): boolean {
  if (!DATE_STRING_PATTERN.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function parseDateString(dateString: string): Date {
  if (!isValidDateString(dateString)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  return fromZonedTime(new Date(`${dateString}T12:00:00`), APP_TIMEZONE);
}

export function formatDateString(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
}

export function shiftDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = addDays(new Date(year, month - 1, day), days);
  return format(shifted, "yyyy-MM-dd");
}

export function getMonthRange(date: Date): DateRange {
  const zoned = zonedDate(date);
  return {
    start: toUtcRangeStart(startOfMonth(zoned)),
    end: toUtcRangeEnd(endOfDay(endOfMonth(zoned))),
  };
}

export function getYearRange(date: Date): DateRange {
  const zoned = zonedDate(date);
  return {
    start: toUtcRangeStart(startOfYear(zoned)),
    end: toUtcRangeEnd(endOfDay(endOfYear(zoned))),
  };
}

export function getWeekRange(date: Date): DateRange {
  const zoned = zonedDate(date);
  const weekStart = startOfDay(startOfWeek(zoned, { weekStartsOn: WEEK_STARTS_ON }));
  const weekEnd = endOfDay(endOfWeek(zoned, { weekStartsOn: WEEK_STARTS_ON }));

  return {
    start: toUtcRangeStart(weekStart),
    end: toUtcRangeEnd(weekEnd),
  };
}

export function formatWeekStartString(date: Date): string {
  return formatDateString(getWeekRange(date).start);
}

export function shiftWeekString(dateString: string, weeks: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const weekStart = startOfWeek(new Date(year, month - 1, day), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return format(addWeeks(weekStart, weeks), "yyyy-MM-dd");
}

export function formatMonthStartString(date: Date): string {
  return formatDateString(getMonthRange(date).start);
}

export function shiftMonthString(dateString: string, months: number): string {
  const monthStart = formatMonthStartString(parseDateString(dateString));
  const [year, month, day] = monthStart.split("-").map(Number);
  return format(addMonths(new Date(year, month - 1, day), months), "yyyy-MM-dd");
}

/** Page title for week plans, e.g. Week of Jun 9. */
export function formatWeekPlanPageTitle(weekStart: Date): string {
  const label = shareDateFormatter({ month: "short", day: "numeric" }).format(
    weekStart,
  );
  return `Week of ${label}`;
}

/** Compact label for month plan nav center (This month, Jun 2026, …). */
export function formatMonthNavLabel(monthStartString: string): string {
  const thisMonthStart = formatMonthStartString(new Date());

  if (monthStartString === thisMonthStart) {
    return "This month";
  }

  return formatShareMonthPeriod(parseDateString(monthStartString));
}

export function getDateRangeForPlanType(
  type: "DAY" | "WEEK" | "MONTH" | "YEAR",
  date = new Date(),
): DateRange {
  switch (type) {
    case "DAY":
      return getDayRange(date);
    case "MONTH":
      return getMonthRange(date);
    case "YEAR":
      return getYearRange(date);
    case "WEEK":
      return getWeekRange(date);
    default:
      return getDayRange(date);
  }
}

export function formatPlanCardDayDate(date: Date): string {
  return shareDateFormatter({
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Compact date for plan list meta lines (e.g. Wed, Jun 10). */
export function formatPlanListRowDate(plan: {
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
}): string {
  switch (plan.type) {
    case "DAY":
      return shareDateFormatter({
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(plan.dateStart);
    case "MONTH":
      return formatShareMonthPeriod(plan.dateStart);
    case "YEAR":
      return formatShareYearPeriod(plan.dateStart);
    case "WEEK":
      return formatShareWeekPeriod(plan.dateStart, plan.dateEnd);
    default:
      return shareDateFormatter({
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(plan.dateStart);
  }
}

export function formatPlanCardDate(plan: {
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
}): string {
  switch (plan.type) {
    case "DAY":
      return formatPlanCardDayDate(plan.dateStart);
    case "MONTH":
      return formatShareMonthPeriod(plan.dateStart);
    case "YEAR":
      return formatShareYearPeriod(plan.dateStart);
    case "WEEK":
      return formatShareWeekPeriod(plan.dateStart, plan.dateEnd);
    default:
      return formatPlanCardDayDate(plan.dateStart);
  }
}

export function formatPlanDateLabel(
  dateStart: Date,
  type: PlanType,
  dateEnd?: Date,
): string {
  switch (type) {
    case "DAY":
      return formatPlanCardDayDate(dateStart);
    case "MONTH":
      return formatShareMonthPeriod(dateStart);
    case "YEAR":
      return formatShareYearPeriod(dateStart);
    case "WEEK":
      return `Week of ${formatShareWeekPeriod(dateStart, dateEnd ?? dateStart)}`;
    default:
      return formatPlanCardDayDate(dateStart);
  }
}

function shareDateFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: APP_TIMEZONE });
}

/** Header context line for day plans (Wednesday, Jun 10). */
export function formatDayPlanContextLabel(date: Date): string {
  return shareDateFormatter({
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Compact label for day plan nav center (Today, Yesterday, Wed, Jun 10, …). */
export function formatDayNavLabel(dateString: string): string {
  const today = formatDateString(new Date());

  if (dateString === today) {
    return "Today";
  }

  if (dateString === shiftDateString(today, -1)) {
    return "Yesterday";
  }

  if (dateString === shiftDateString(today, 1)) {
    return "Tomorrow";
  }

  return shareDateFormatter({
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseDateString(dateString));
}

/** Compact label for week plan nav center (This week, Jun 2–8, …). */
export function formatWeekNavLabel(weekStartString: string): string {
  const thisWeekStart = formatWeekStartString(new Date());

  if (weekStartString === thisWeekStart) {
    return "This week";
  }

  const start = parseDateString(weekStartString);
  const { end } = getWeekRange(start);
  const startMonth = shareDateFormatter({ month: "short" }).format(start);
  const endMonth = shareDateFormatter({ month: "short" }).format(end);
  const startDay = shareDateFormatter({ day: "numeric" }).format(start);
  const endDay = shareDateFormatter({ day: "numeric" }).format(end);

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export function formatShareDayPeriod(date: Date): string {
  return shareDateFormatter({
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatShareMonthPeriod(date: Date): string {
  return shareDateFormatter({
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShareYearPeriod(date: Date): string {
  return shareDateFormatter({ year: "numeric" }).format(date);
}

export function formatShareWeekPeriod(start: Date, end: Date): string {
  const startMonth = shareDateFormatter({ month: "long" }).format(start);
  const endMonth = shareDateFormatter({ month: "long" }).format(end);
  const startDay = shareDateFormatter({ day: "numeric" }).format(start);
  const endDay = shareDateFormatter({ day: "numeric" }).format(end);
  const startYear = shareDateFormatter({ year: "numeric" }).format(start);
  const endYear = shareDateFormatter({ year: "numeric" }).format(end);

  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startDay}–${endDay}, ${startYear}`;
  }

  if (startYear === endYear) {
    const endMonthShort = shareDateFormatter({ month: "short" }).format(end);
    return `${startMonth} ${startDay}–${endMonthShort} ${endDay}, ${startYear}`;
  }

  return formatDateRange(start, end);
}

export function formatPlanPeriodForShare(plan: {
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
}): string {
  switch (plan.type) {
    case "DAY":
      return formatShareDayPeriod(plan.dateStart);
    case "MONTH":
      return formatShareMonthPeriod(plan.dateStart);
    case "YEAR":
      return formatShareYearPeriod(plan.dateStart);
    case "WEEK":
      return formatShareWeekPeriod(plan.dateStart, plan.dateEnd);
    default:
      return formatShareDayPeriod(plan.dateStart);
  }
}

export function formatAdminDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(date);
}

export function formatDateRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  });

  const startLabel = formatter.format(start);
  const endLabel = formatter.format(end);

  if (startLabel === endLabel) {
    return startLabel;
  }

  return `${startLabel} – ${endLabel}`;
}

/** Display label for a day plan date, e.g. "Friday, Jun 14". */
export function formatDayPlanDisplayDate(dateString: string): string {
  const date = parseDateString(dateString);
  return formatInTimeZone(date, APP_TIMEZONE, "EEEE, MMM d");
}
