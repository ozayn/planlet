import {
  addDays,
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

export function formatPlanDateLabel(
  dateStart: Date,
  type: PlanType,
  dateEnd?: Date,
): string {
  switch (type) {
    case "DAY":
      return formatShareDayPeriod(dateStart);
    case "MONTH":
      return formatShareMonthPeriod(dateStart);
    case "YEAR":
      return formatShareYearPeriod(dateStart);
    case "WEEK":
      return `Week of ${formatShareWeekPeriod(dateStart, dateEnd ?? dateStart)}`;
    default:
      return formatShareDayPeriod(dateStart);
  }
}

function shareDateFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: APP_TIMEZONE });
}

export function formatWeekPlanTitle(date: Date, now = new Date()): string {
  const selectedWeekStart = getWeekRange(date).start.getTime();
  const currentWeekStart = getWeekRange(now).start.getTime();

  if (selectedWeekStart === currentWeekStart) {
    return "Weekly plan";
  }

  const { start } = getWeekRange(date);
  const month = shareDateFormatter({ month: "long" }).format(start);
  const day = shareDateFormatter({ day: "numeric" }).format(start);
  return `Week of ${month} ${day}`;
}

export function formatDayPlanTitle(date: Date, now = new Date()): string {
  const selected = getDayRange(date).start.getTime();
  const today = getTodayRange(now).start.getTime();

  if (selected === today) {
    return "Today's plan";
  }

  const weekday = shareDateFormatter({ weekday: "long" }).format(date);
  return `${weekday} plan`;
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
