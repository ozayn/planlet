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
  completedAt: string | null;
  themeId: string | null;
  themeName: string | null;
  projectId: string | null;
  projectName: string | null;
  /** Optional Life Area links; at most one isPrimary. */
  lifeAreas: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
    archived: boolean;
  }>;
  commentCount: number;
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
  updatedAt: string;
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
  completedAt?: Date | null;
  theme?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  lifeAreaLinks?: Array<{
    isPrimary: boolean;
    lifeArea: { id: string; name: string; archivedAt: Date | null };
  }>;
  _count?: { comments: number };
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
    completedAt: item.completedAt?.toISOString() ?? null,
    themeId: item.theme?.id ?? null,
    themeName: item.theme?.name ?? null,
    projectId: item.project?.id ?? null,
    projectName: item.project?.name ?? null,
    lifeAreas: (item.lifeAreaLinks ?? []).map((link) => ({
      id: link.lifeArea.id,
      name: link.lifeArea.name,
      isPrimary: link.isPrimary,
      archived: link.lifeArea.archivedAt != null,
    })),
    commentCount: item._count?.comments ?? 0,
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
  updatedAt: Date;
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
    updatedAt: plan.updatedAt.toISOString(),
    items: plan.items.map(serializePlanItem),
  };
}
