import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import type { PlanType } from "@/app/generated/prisma/client";
import { APP_TIMEZONE } from "@/config/time";

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

export function getTodayRange(now = new Date()): DateRange {
  const zonedNow = zonedDate(now);
  return {
    start: toUtcRangeStart(startOfDay(zonedNow)),
    end: toUtcRangeEnd(endOfDay(zonedNow)),
  };
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

export function getDateRangeForPlanType(
  type: "DAY" | "WEEK" | "MONTH" | "YEAR",
  now = new Date(),
): DateRange {
  switch (type) {
    case "DAY":
      return getTodayRange(now);
    case "MONTH":
      return getMonthRange(now);
    case "YEAR":
      return getYearRange(now);
    case "WEEK": {
      const zonedNow = zonedDate(now);
      const weekStart = startOfDay(zonedNow);
      const weekEnd = endOfDay(addDays(weekStart, 6));
      return {
        start: toUtcRangeStart(weekStart),
        end: toUtcRangeEnd(weekEnd),
      };
    }
    default:
      return getTodayRange(now);
  }
}

function shareDateFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: APP_TIMEZONE });
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
