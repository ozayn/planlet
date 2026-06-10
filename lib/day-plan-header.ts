import {
  formatDateString,
  formatDayPlanContextLabel,
  parseDateString,
} from "@/lib/dates";
import { formatCompactActivityTime } from "@/lib/plan-activity";

export type DayPlanPageVariant = "today" | "day";

export function buildDayPlanPageTitle(
  currentDate: string,
  variant: DayPlanPageVariant,
  firstName?: string | null,
): string {
  const today = formatDateString(new Date());
  const nameSuffix = firstName?.trim() ? `, ${firstName.trim()}` : "";

  if (variant === "today" || currentDate === today) {
    return `Today${nameSuffix}`;
  }

  return formatDayPlanContextLabel(parseDateString(currentDate));
}

export function buildDayPlanPageSubtitle(
  currentDate: string,
  updatedAt: Date,
  variant: DayPlanPageVariant,
): string {
  const today = formatDateString(new Date());
  const activity = formatCompactActivityTime(updatedAt);
  const updated = `Updated ${activity}`;

  if (variant === "today") {
    const dateLabel = formatDayPlanContextLabel(parseDateString(currentDate));
    return `${dateLabel} · ${updated}`;
  }

  if (currentDate === today) {
    return updated;
  }

  return updated;
}
