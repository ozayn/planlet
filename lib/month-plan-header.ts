import { formatShareMonthPeriod, parseDateString } from "@/lib/dates";
import { formatCompactActivityTime } from "@/lib/plan-activity";

export function buildMonthPlanPageTitle(monthStart: string): string {
  return formatShareMonthPeriod(parseDateString(monthStart));
}

export function buildMonthPlanPageSubtitle(updatedAt: Date): string {
  return `Updated ${formatCompactActivityTime(updatedAt)}`;
}
