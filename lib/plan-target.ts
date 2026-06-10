import type { PlanType } from "@/app/generated/prisma/client";

import {
  formatPlanDateLabel,
  formatShareDayPeriod,
  formatShareMonthPeriod,
  formatShareWeekPeriod,
  formatShareYearPeriod,
  getWeekRange,
  parseDateString,
} from "@/lib/dates";

export const PLAN_TARGET_TYPES: PlanType[] = ["DAY", "WEEK", "MONTH", "YEAR"];

export const PLAN_TARGET_TYPE_LABELS: Record<PlanType, string> = {
  DAY: "Day",
  WEEK: "Week",
  MONTH: "Month",
  YEAR: "Year",
};

export function getPlanTargetTypeLabel(type: PlanType): string {
  return PLAN_TARGET_TYPE_LABELS[type];
}

export function dateStringToMonthValue(dateString: string): string {
  return dateString.slice(0, 7);
}

export function monthValueToDateString(monthValue: string): string {
  return `${monthValue}-01`;
}

export function dateStringToYearValue(dateString: string): string {
  return dateString.slice(0, 4);
}

export function yearValueToDateString(year: string): string {
  return `${year.padStart(4, "0")}-01-01`;
}

export function formatPlanTargetSummary(
  planType: PlanType,
  dateString: string,
): string {
  const date = parseDateString(dateString);

  switch (planType) {
    case "DAY":
      return `This will save to ${formatShareDayPeriod(date)}.`;
    case "WEEK": {
      const { start, end } = getWeekRange(date);
      return `This will save to the week of ${formatShareWeekPeriod(start, end)}.`;
    }
    case "MONTH":
      return `This will save to ${formatShareMonthPeriod(date)}.`;
    case "YEAR":
      return `This will save to ${formatShareYearPeriod(date)}.`;
    default:
      return `This will save to ${formatShareDayPeriod(date)}.`;
  }
}

export function formatPlanForLabel(
  planType: PlanType,
  dateString: string,
): string {
  const date = parseDateString(dateString);

  switch (planType) {
    case "DAY":
      return formatShareDayPeriod(date);
    case "WEEK": {
      const { start, end } = getWeekRange(date);
      return `Week of ${formatShareWeekPeriod(start, end)}`;
    }
    case "MONTH":
      return formatPlanDateLabel(date, "MONTH");
    case "YEAR":
      return formatPlanDateLabel(date, "YEAR");
    default:
      return formatShareDayPeriod(date);
  }
}
