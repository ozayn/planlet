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
