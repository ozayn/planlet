import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  format,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { APP_TIMEZONE } from "@/config/time";

type PlanActivitySource = {
  updatedAt: Date | string;
};

export function getPlanRecentActivityAt(plan: PlanActivitySource): Date {
  return plan.updatedAt instanceof Date
    ? plan.updatedAt
    : new Date(plan.updatedAt);
}

export function formatRelativeActivityTime(
  date: Date,
  now = new Date(),
  timezone = APP_TIMEZONE,
): string {
  const zonedNow = toZonedTime(now, timezone);
  const zonedDate = toZonedTime(date, timezone);

  const minutes = differenceInMinutes(zonedNow, zonedDate);
  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const calendarDays = differenceInCalendarDays(zonedNow, zonedDate);
  const hours = differenceInHours(zonedNow, zonedDate);
  if (calendarDays === 0 && hours >= 1) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (calendarDays === 1) {
    return `Yesterday, ${format(zonedDate, "h:mm a")}`;
  }

  if (calendarDays < 7) {
    return format(zonedDate, "EEE, MMM d");
  }

  if (zonedDate.getFullYear() === zonedNow.getFullYear()) {
    return format(zonedDate, "MMM d");
  }

  return format(zonedDate, "MMM d, yyyy");
}

export function formatPlanActivityLabel(
  date: Date,
  now = new Date(),
  timezone = APP_TIMEZONE,
): string {
  return `Updated ${formatRelativeActivityTime(date, now, timezone)}`;
}
