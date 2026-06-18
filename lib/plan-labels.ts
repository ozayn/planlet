import type {
  PlanItemType,
  PlanLanguage,
  PlanType,
  PriorityLevel,
  TimeHint,
} from "@/app/generated/prisma/client";

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  DAY: "Daily",
  WEEK: "Weekly",
  MONTH: "Monthly",
  YEAR: "Yearly",
};

/** Compact badges for plan list rows. */
export const PLAN_TYPE_BADGE_LABELS: Record<PlanType, string> = {
  DAY: "Day",
  WEEK: "Week",
  MONTH: "Month",
  YEAR: "Year",
};

export const PLAN_ITEM_TYPE_LABELS: Record<PlanItemType, string> = {
  TASK: "Task",
  EVENT: "Event",
  INTENTION: "Intention",
  NOTE: "Note",
  WORK_BLOCK: "Work block",
  ERRAND: "Errand",
  SOCIAL: "Social",
  REST: "Rest",
};

export function getPlanTypeLabel(type: PlanType): string {
  return PLAN_TYPE_LABELS[type];
}

export function getPlanTypeBadgeLabel(type: PlanType): string {
  return PLAN_TYPE_BADGE_LABELS[type];
}

export function getPlanItemTypeLabel(type: PlanItemType): string {
  return PLAN_ITEM_TYPE_LABELS[type];
}

export const TIME_HINT_LABELS: Record<TimeHint, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  ANYTIME: "Anytime",
  ALL_DAY: "All day",
  SPECIFIC: "Specific time",
};

export const PRIORITY_LEVEL_LABELS: Record<PriorityLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const PLAN_LANGUAGE_LABELS: Record<PlanLanguage, string> = {
  FA: "Farsi",
  EN: "English",
  MIXED: "Mixed",
  UNKNOWN: "Unknown",
};

export function getTimeHintLabel(hint: TimeHint | null | undefined): string | null {
  if (!hint) return null;
  return TIME_HINT_LABELS[hint];
}
