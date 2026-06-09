import type {
  ConfidenceLevel,
  ExcitementLevel,
  PlanItemStatus,
  PlanItemType,
  PlanLanguage,
  PlanType,
  PriorityLevel,
  SatisfactionLevel,
  TimeHint,
} from "@/app/generated/prisma/client";

export type SerializedPlanItem = {
  id: string;
  planId: string;
  parentItemId: string | null;
  title: string;
  description: string | null;
  type: PlanItemType;
  status: PlanItemStatus;
  progressLevel: number;
  satisfactionLevel: SatisfactionLevel | null;
  confidenceLevel: ConfidenceLevel | null;
  excitementLevel: ExcitementLevel | null;
  importance: PriorityLevel | null;
  urgency: PriorityLevel | null;
  timeHint: TimeHint | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  comment: string | null;
  shareable: boolean;
  sortOrder: number;
  subtasks: SerializedPlanItem[];
};

export type SerializedPlan = {
  id: string;
  title: string;
  type: PlanType;
  dateStart: string;
  dateEnd: string;
  language: PlanLanguage;
  summary: string | null;
  items: SerializedPlanItem[];
};

type PlanItemWithSubtasks = {
  id: string;
  planId: string;
  parentItemId: string | null;
  title: string;
  description: string | null;
  type: PlanItemType;
  status: PlanItemStatus;
  progressLevel: number;
  satisfactionLevel: SatisfactionLevel | null;
  confidenceLevel: ConfidenceLevel | null;
  excitementLevel: ExcitementLevel | null;
  importance: PriorityLevel | null;
  urgency: PriorityLevel | null;
  timeHint: TimeHint | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  comment: string | null;
  shareable: boolean;
  sortOrder: number;
  subtasks?: PlanItemWithSubtasks[];
};

export function serializePlanItem(item: PlanItemWithSubtasks): SerializedPlanItem {
  return {
    id: item.id,
    planId: item.planId,
    parentItemId: item.parentItemId,
    title: item.title,
    description: item.description,
    type: item.type,
    status: item.status,
    progressLevel: item.progressLevel,
    satisfactionLevel: item.satisfactionLevel,
    confidenceLevel: item.confidenceLevel,
    excitementLevel: item.excitementLevel,
    importance: item.importance,
    urgency: item.urgency,
    timeHint: item.timeHint,
    startTime: item.startTime?.toISOString() ?? null,
    endTime: item.endTime?.toISOString() ?? null,
    durationMinutes: item.durationMinutes,
    comment: item.comment,
    shareable: item.shareable,
    sortOrder: item.sortOrder,
    subtasks: (item.subtasks ?? []).map(serializePlanItem),
  };
}

export function serializePlan(plan: {
  id: string;
  title: string;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  language: PlanLanguage;
  summary: string | null;
  items: PlanItemWithSubtasks[];
}): SerializedPlan {
  return {
    id: plan.id,
    title: plan.title,
    type: plan.type,
    dateStart: plan.dateStart.toISOString(),
    dateEnd: plan.dateEnd.toISOString(),
    language: plan.language,
    summary: plan.summary,
    items: plan.items.map(serializePlanItem),
  };
}
