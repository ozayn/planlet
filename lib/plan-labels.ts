import type { PlanItemType, PlanType } from "@/app/generated/prisma/client";

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  DAY: "Daily",
  WEEK: "Weekly",
  MONTH: "Monthly",
  YEAR: "Yearly",
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

export function getPlanItemTypeLabel(type: PlanItemType): string {
  return PLAN_ITEM_TYPE_LABELS[type];
}
