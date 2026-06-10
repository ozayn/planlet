import { formatDateString, formatWeekStartString } from "@/lib/dates";
import type { PeriodSummaryType } from "@/lib/period-summary-types";

export function getPeriodSummaryHref(
  type: PeriodSummaryType,
  dateStart: Date,
): string {
  const dateString =
    type === "WEEK"
      ? formatWeekStartString(dateStart)
      : formatDateString(dateStart);

  const segment =
    type === "WEEK" ? "week" : type === "MONTH" ? "month" : "year";

  return `/plans/${segment}/${dateString}/summary`;
}
