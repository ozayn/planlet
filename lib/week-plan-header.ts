import { APP_TIMEZONE } from "@/config/time";
import {
  formatWeekPlanPageTitle,
  getWeekRange,
  parseDateString,
} from "@/lib/dates";
import { formatCompactActivityTime } from "@/lib/plan-activity";

export function buildWeekPlanPageTitle(weekStart: string): string {
  return formatWeekPlanPageTitle(parseDateString(weekStart));
}

export function buildWeekPlanPageSubtitle(
  weekStart: string,
  updatedAt: Date,
): string {
  const { start, end } = getWeekRange(parseDateString(weekStart));
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const startLabel = formatter.format(start);
  const endLabel = formatter.format(end);
  const activity = formatCompactActivityTime(updatedAt);

  return `${startLabel}–${endLabel} · Updated ${activity}`;
}
