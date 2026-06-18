import { formatShareYearPeriod, parseDateString } from "@/lib/dates";
import { formatCompactActivityTime } from "@/lib/plan-activity";

export function buildYearPlanPageTitle(yearStart: string): string {
  return formatShareYearPeriod(parseDateString(yearStart));
}

export function buildYearPlanPageSubtitle(updatedAt: Date): string {
  return `Updated ${formatCompactActivityTime(updatedAt)}`;
}
