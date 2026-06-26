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
  Prisma,
} from "@/app/generated/prisma/client";
import { PlanType as PlanTypeEnum } from "@/app/generated/prisma/client";

import {
  formatDateString,
  formatDayPlanDisplayDate,
  getDayRange,
  getMonthRange,
  getTodayRange,
  getWeekRange,
  getYearRange,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import { canEditPlan, canViewPlan } from "@/lib/plan-sharing";
import { deriveParentStatusFromSubtasks, shouldCascadeDoneToSubtasks } from "@/lib/parent-task-status";
import { resolveCompletedAt } from "@/lib/plan-item-completed-at";
import { normalizeProgressForStatus } from "@/lib/plan-status";
import {
  getPlanItemSectionGroup,
  getSiblingItemsWhere,
  isTaskItemType,
  TASK_ITEM_TYPES,
  type PlanItemReorderScope,
  type PlanItemSectionGroup,
} from "@/lib/plan-item-sections";
import {
  formatDayPlanTitle,
  formatMonthPlanTitle,
  formatWeekPlanTitle,
  formatYearPlanTitle,
  resolvePlanTitle,
} from "@/lib/plan-titles";
import { STALE_LIST_MESSAGE } from "@/lib/action-errors";
import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { prisma } from "@/lib/prisma";
import { validatePlanItemAssignment } from "@/lib/themes-projects";

const itemOrderBy = [
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
];

const planItemInclude = {
  subtasks: {
    orderBy: itemOrderBy,
    include: {
      theme: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  },
  theme: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
};

const rootItemsInclude = {
  where: { parentItemId: null },
  orderBy: itemOrderBy,
  include: planItemInclude,
};

class PlanAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanAccessError";
  }
}

type PlanItemDbClient = Prisma.TransactionClient | typeof prisma;

async function cascadeDoneStatusToSubtasks(
  tx: PlanItemDbClient,
  parentItemId: string,
  completedAt: Date,
) {
  await tx.planItem.updateMany({
    where: {
      parentItemId,
      status: { not: "DONE" },
    },
    data: {
      status: "DONE",
      progressLevel: normalizeProgressForStatus("DONE"),
      completedAt,
    },
  });
}

async function applyItemStatusUpdate(
  tx: PlanItemDbClient,
  itemId: string,
  status: PlanItemStatus,
  progressLevel: number,
) {
  const existing = await tx.planItem.findUnique({
    where: { id: itemId },
    select: { status: true, completedAt: true },
  });

  if (!existing) {
    throw new PlanAccessError("Plan item not found");
  }

  const now = new Date();
  const completedAt = resolveCompletedAt(
    existing.status,
    status,
    existing.completedAt,
    now,
  );

  await tx.planItem.update({
    where: { id: itemId },
    data: { status, progressLevel, completedAt },
  });

  const subtaskCount = await tx.planItem.count({
    where: { parentItemId: itemId },
  });

  if (shouldCascadeDoneToSubtasks(status, subtaskCount)) {
    await cascadeDoneStatusToSubtasks(tx, itemId, now);
  }
}

async function requirePlanForUser(planId: string, userId: string) {
  const canEdit = await canEditPlan(planId, userId);

  if (!canEdit) {
    throw new PlanAccessError("Plan not found");
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId },
  });

  if (!plan) {
    throw new PlanAccessError("Plan not found");
  }

  return plan;
}

async function requirePlanItemForUser(itemId: string, userId: string) {
  const item = await prisma.planItem.findFirst({
    where: { id: itemId, plan: { userId } },
    include: { plan: true },
  });

  if (!item) {
    throw new PlanAccessError("Plan item not found");
  }

  return item;
}

export async function getDayPlan(userId: string, date: Date) {
  const { start } = getDayRange(date);

  return prisma.plan.findFirst({
    where: {
      userId,
      type: PlanTypeEnum.DAY,
      dateStart: start,
    },
    include: {
      items: rootItemsInclude,
    },
  });
}

export async function getTodayPlan(userId: string) {
  return getDayPlan(userId, new Date());
}

export async function getOrCreateDayPlan(
  userId: string,
  date: Date,
  title?: string,
) {
  const existing = await getDayPlan(userId, date);

  if (existing) {
    return existing;
  }

  const { start, end } = getDayRange(date);

  const plan = await prisma.plan.create({
    data: {
      userId,
      type: PlanTypeEnum.DAY,
      title: title ?? formatDayPlanTitle(date),
      dateStart: start,
      dateEnd: end,
      language: "UNKNOWN",
    },
    include: {
      items: rootItemsInclude,
    },
  });

  await touchUserSeen(userId);

  return plan;
}

export async function getUpcomingDayPlans(userId: string) {
  const { start } = getTodayRange();

  return prisma.plan.findMany({
    where: {
      userId,
      type: PlanTypeEnum.DAY,
      dateStart: { gte: start },
    },
    orderBy: { dateStart: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getWeekPlan(userId: string, date: Date) {
  const { start } = getWeekRange(date);

  return prisma.plan.findFirst({
    where: {
      userId,
      type: PlanTypeEnum.WEEK,
      dateStart: start,
    },
    include: {
      items: rootItemsInclude,
    },
  });
}

export async function getOrCreateWeekPlan(
  userId: string,
  date: Date,
  title?: string,
) {
  const existing = await getWeekPlan(userId, date);

  if (existing) {
    return existing;
  }

  const { start, end } = getWeekRange(date);

  const plan = await prisma.plan.create({
    data: {
      userId,
      type: PlanTypeEnum.WEEK,
      title: title ?? formatWeekPlanTitle(date),
      dateStart: start,
      dateEnd: end,
      language: "UNKNOWN",
    },
    include: {
      items: rootItemsInclude,
    },
  });

  await touchUserSeen(userId);

  return plan;
}

export async function getMonthPlan(userId: string, date: Date) {
  const { start } = getMonthRange(date);

  return prisma.plan.findFirst({
    where: {
      userId,
      type: PlanTypeEnum.MONTH,
      dateStart: start,
    },
    include: {
      items: rootItemsInclude,
    },
  });
}

export async function getOrCreateMonthPlan(
  userId: string,
  date: Date,
  title?: string,
) {
  const existing = await getMonthPlan(userId, date);

  if (existing) {
    return existing;
  }

  const { start, end } = getMonthRange(date);

  const plan = await prisma.plan.create({
    data: {
      userId,
      type: PlanTypeEnum.MONTH,
      title: title ?? formatMonthPlanTitle(date),
      dateStart: start,
      dateEnd: end,
      language: "UNKNOWN",
    },
    include: {
      items: rootItemsInclude,
    },
  });

  await touchUserSeen(userId);

  return plan;
}

export async function getYearPlan(userId: string, date: Date) {
  const { start } = getYearRange(date);

  return prisma.plan.findFirst({
    where: {
      userId,
      type: PlanTypeEnum.YEAR,
      dateStart: start,
    },
    include: {
      items: rootItemsInclude,
    },
  });
}

export async function getOrCreateYearPlan(
  userId: string,
  date: Date,
  title?: string,
) {
  const existing = await getYearPlan(userId, date);

  if (existing) {
    return existing;
  }

  const { start, end } = getYearRange(date);

  const plan = await prisma.plan.create({
    data: {
      userId,
      type: PlanTypeEnum.YEAR,
      title: title ?? formatYearPlanTitle(date),
      dateStart: start,
      dateEnd: end,
      language: "UNKNOWN",
    },
    include: {
      items: rootItemsInclude,
    },
  });

  await touchUserSeen(userId);

  return plan;
}

export async function getUpcomingWeekPlans(userId: string) {
  const { start } = getWeekRange(new Date());

  return prisma.plan.findMany({
    where: {
      userId,
      type: PlanTypeEnum.WEEK,
      dateStart: { gte: start },
    },
    orderBy: { dateStart: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getPlanWithItems(planId: string, userId: string) {
  const hasAccess = await canViewPlan(planId, userId);

  if (!hasAccess) {
    return null;
  }

  return prisma.plan.findFirst({
    where: { id: planId },
    include: {
      items: rootItemsInclude,
      shareExports: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export const PLANS_LIST_FETCH_LIMIT = 100;

export async function getRecentPlansForList(
  userId: string,
  limit = PLANS_LIST_FETCH_LIMIT,
) {
  return prisma.plan.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getPlansByType(userId: string, type?: PlanType) {
  return prisma.plan.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
    orderBy: { dateStart: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });
}

export type CreatePlanInput = {
  userId: string;
  type: PlanType;
  title: string;
  dateStart: Date;
  dateEnd: Date;
  rawInput?: string;
  summary?: string;
  language?: PlanLanguage;
};

export class PlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanError";
  }
}

export async function updatePlanTitle(
  planId: string,
  userId: string,
  title: string,
) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true, type: true, dateStart: true, dateEnd: true },
  });

  if (!plan) {
    throw new PlanError("Plan not found.");
  }

  const resolvedTitle = resolvePlanTitle(
    title,
    plan.type,
    plan.dateStart,
    plan.dateEnd,
  );

  const updated = await prisma.plan.update({
    where: { id: planId },
    data: { title: resolvedTitle },
    select: { id: true, title: true, type: true, dateStart: true },
  });

  await touchUserSeen(userId);

  return updated;
}

export async function createPlan(input: CreatePlanInput) {
  const plan = await prisma.plan.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      dateStart: input.dateStart,
      dateEnd: input.dateEnd,
      rawInput: input.rawInput,
      summary: input.summary,
      language: input.language,
    },
  });

  await touchUserSeen(input.userId);

  return plan;
}

export type CreatePlanItemInput = {
  userId: string;
  planId: string;
  title: string;
  parentItemId?: string;
  description?: string;
  type?: PlanItemType;
  status?: PlanItemStatus;
  progressLevel?: number;
  satisfactionLevel?: SatisfactionLevel;
  confidenceLevel?: ConfidenceLevel;
  excitementLevel?: ExcitementLevel;
  importance?: PriorityLevel;
  urgency?: PriorityLevel;
  timeHint?: TimeHint;
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
  comment?: string;
  shareable?: boolean;
  sortOrder?: number;
  themeId?: string | null;
  projectId?: string | null;
};

export async function createPlanItem(input: CreatePlanItemInput) {
  await requirePlanForUser(input.planId, input.userId);

  if (input.parentItemId) {
    const parent = await prisma.planItem.findFirst({
      where: {
        id: input.parentItemId,
        planId: input.planId,
      },
    });

    if (!parent) {
      throw new PlanAccessError("Parent item not found on this plan");
    }
  }

  const status = input.status ?? "OPEN";
  const progressLevel =
    input.progressLevel ?? normalizeProgressForStatus(status);

  let sortOrder = input.sortOrder;

  if (sortOrder === undefined) {
    const lastItem = await prisma.planItem.findFirst({
      where: {
        planId: input.planId,
        parentItemId: input.parentItemId ?? null,
      },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    sortOrder = lastItem ? lastItem.sortOrder + 100 : 0;
  }

  const assignment = await validatePlanItemAssignment(
    input.userId,
    input.themeId,
    input.projectId,
  );

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.planItem.create({
      data: {
        planId: input.planId,
        parentItemId: input.parentItemId,
        title: input.title,
        description: input.description,
        type: input.type,
        status,
        progressLevel,
        satisfactionLevel: input.satisfactionLevel,
        confidenceLevel: input.confidenceLevel,
        excitementLevel: input.excitementLevel,
        importance: input.importance,
        urgency: input.urgency,
        timeHint: input.timeHint,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes,
        comment: input.comment,
        shareable: input.shareable,
        sortOrder,
        themeId: assignment.themeId,
        projectId: assignment.projectId,
      },
      include: planItemInclude,
    });

    if (input.parentItemId) {
      await syncParentStatusFromSubtasks(input.parentItemId, input.userId, tx);
    }

    return created;
  });

  await touchPlan(input.planId);
  await touchUserSeen(input.userId);

  return item;
}

export type UpdatePlanItemStatusInput = {
  userId: string;
  itemId: string;
  status: PlanItemStatus;
  progressLevel?: number;
};

async function syncParentStatusFromSubtasks(
  parentItemId: string,
  userId: string,
  tx: PlanItemDbClient = prisma,
) {
  const parent = await tx.planItem.findFirst({
    where: { id: parentItemId, plan: { userId } },
    select: { id: true, status: true, progressLevel: true, completedAt: true },
  });

  if (!parent) {
    return;
  }

  const subtasks = await tx.planItem.findMany({
    where: { parentItemId },
    select: { status: true },
    orderBy: itemOrderBy,
  });

  const derivedStatus = deriveParentStatusFromSubtasks(
    subtasks.map((subtask) => subtask.status),
    parent.status,
  );

  if (derivedStatus === parent.status) {
    return;
  }

  const now = new Date();
  const completedAt = resolveCompletedAt(
    parent.status,
    derivedStatus,
    parent.completedAt,
    now,
  );

  await tx.planItem.update({
    where: { id: parentItemId },
    data: {
      status: derivedStatus,
      progressLevel: normalizeProgressForStatus(
        derivedStatus,
        parent.progressLevel,
      ),
      completedAt,
    },
  });
}

export async function updatePlanItemStatus(input: UpdatePlanItemStatusInput) {
  const item = await requirePlanItemForUser(input.itemId, input.userId);

  const progressLevel =
    input.progressLevel ??
    normalizeProgressForStatus(input.status, item.progressLevel);

  const updated = await prisma.$transaction(async (tx) => {
    await applyItemStatusUpdate(tx, input.itemId, input.status, progressLevel);

    return tx.planItem.findUniqueOrThrow({
      where: { id: input.itemId },
      include: planItemInclude,
    });
  });

  if (item.parentItemId) {
    await syncParentStatusFromSubtasks(item.parentItemId, input.userId);
  }

  await touchPlan(item.planId);
  await touchUserSeen(input.userId);

  return updated;
}

export type UpdatePlanItemInput = {
  userId: string;
  itemId: string;
  title?: string;
  description?: string | null;
  type?: PlanItemType;
  status?: PlanItemStatus;
  progressLevel?: number;
  satisfactionLevel?: SatisfactionLevel | null;
  confidenceLevel?: ConfidenceLevel | null;
  excitementLevel?: ExcitementLevel | null;
  importance?: PriorityLevel | null;
  urgency?: PriorityLevel | null;
  timeHint?: TimeHint | null;
  startTime?: Date | null;
  endTime?: Date | null;
  durationMinutes?: number | null;
  comment?: string | null;
  shareable?: boolean;
  sortOrder?: number;
  themeId?: string | null;
  projectId?: string | null;
};

export async function updatePlanItem(input: UpdatePlanItemInput) {
  const item = await requirePlanItemForUser(input.itemId, input.userId);

  const {
    userId: _userId,
    itemId,
    status,
    progressLevel,
    themeId,
    projectId,
    ...fields
  } = input;

  const nextStatus = status ?? item.status;
  const nextProgress =
    progressLevel ??
    (status ? normalizeProgressForStatus(status, item.progressLevel) : undefined);

  let assignment: { themeId: string | null; projectId: string | null } | undefined;

  if (themeId !== undefined || projectId !== undefined) {
    assignment = await validatePlanItemAssignment(
      input.userId,
      themeId !== undefined ? themeId : item.themeId,
      projectId !== undefined ? projectId : item.projectId,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const completedAt = status
      ? resolveCompletedAt(item.status, nextStatus, item.completedAt, now)
      : undefined;

    const nextItem = await tx.planItem.update({
      where: { id: itemId },
      data: {
        ...fields,
        ...(status
          ? { status: nextStatus, completedAt }
          : {}),
        ...(nextProgress !== undefined ? { progressLevel: nextProgress } : {}),
        ...(assignment
          ? {
              themeId: assignment.themeId,
              projectId: assignment.projectId,
            }
          : {}),
      },
      include: planItemInclude,
    });

    if (status === "DONE") {
      const subtaskCount = await tx.planItem.count({
        where: { parentItemId: itemId },
      });

      if (shouldCascadeDoneToSubtasks(nextStatus, subtaskCount)) {
        await cascadeDoneStatusToSubtasks(tx, itemId, now);
      }
    }

    return nextItem;
  });

  if (status !== undefined && item.parentItemId) {
    await syncParentStatusFromSubtasks(item.parentItemId, input.userId);
  }

  await touchPlan(item.planId);
  await touchUserSeen(input.userId);

  return updated;
}

export async function deletePlanItem(itemId: string, userId: string) {
  const item = await requirePlanItemForUser(itemId, userId);
  const parentItemId = item.parentItemId;

  const deleted = await prisma.planItem.delete({
    where: { id: itemId },
  });

  if (parentItemId) {
    const remainingSubtasks = await prisma.planItem.count({
      where: { parentItemId },
    });

    if (remainingSubtasks > 0) {
      await syncParentStatusFromSubtasks(parentItemId, userId);
    }
  }

  await touchPlan(item.planId);
  await touchUserSeen(userId);

  return deleted;
}

export async function deletePlan(planId: string, userId: string) {
  const plan = await requirePlanForUser(planId, userId);

  await prisma.$transaction([
    prisma.notification.deleteMany({
      where: { href: `/plans/${planId}` },
    }),
    prisma.plan.delete({
      where: { id: planId },
    }),
  ]);

  await touchUserSeen(userId);

  return plan;
}

export const REORDER_FAILED_MESSAGE =
  "Couldn't reorder this item. Reload and try again.";

function rejectInvalidItemOrder(detail: string): never {
  if (process.env.NODE_ENV === "development") {
    console.warn("[reorderPlanItems]", detail);
  }

  throw new PlanError(REORDER_FAILED_MESSAGE);
}

export type ReorderPlanItemsInput = {
  planId: string;
  userId: string;
  orderedItemIds: string[];
  parentItemId?: string | null;
  sectionGroup: PlanItemSectionGroup;
};

export async function reorderPlanItems({
  planId,
  userId,
  orderedItemIds,
  parentItemId = null,
  sectionGroup,
}: ReorderPlanItemsInput) {
  await requirePlanForUser(planId, userId);

  if (parentItemId) {
    const parent = await prisma.planItem.findFirst({
      where: { id: parentItemId, planId },
      select: { id: true },
    });

    if (!parent) {
      rejectInvalidItemOrder(`Parent item ${parentItemId} not found on plan ${planId}`);
    }
  }

  const scope: PlanItemReorderScope = { parentItemId, sectionGroup };
  const siblings = await prisma.planItem.findMany({
    where: getSiblingItemsWhere(planId, scope),
    select: { id: true },
    orderBy: itemOrderBy,
  });

  const siblingIds = new Set(siblings.map((item) => item.id));
  const uniqueSubmittedIds = new Set(orderedItemIds);

  if (uniqueSubmittedIds.size !== orderedItemIds.length) {
    rejectInvalidItemOrder("Duplicate item IDs in reorder payload");
  }

  if (orderedItemIds.length !== siblings.length) {
    const allSubmittedAreSiblings = orderedItemIds.every((itemId) =>
      siblingIds.has(itemId),
    );

    if (allSubmittedAreSiblings && orderedItemIds.length < siblings.length) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[reorderPlanItems] Stale reorder payload:",
          `expected ${siblings.length} siblings, received ${orderedItemIds.length}`,
        );
      }

      throw new PlanError(STALE_LIST_MESSAGE);
    }

    rejectInvalidItemOrder(
      `Expected ${siblings.length} sibling IDs for ${sectionGroup}, received ${orderedItemIds.length}`,
    );
  }

  for (const itemId of orderedItemIds) {
    if (!siblingIds.has(itemId)) {
      rejectInvalidItemOrder(
        `Item ${itemId} is not a sibling in ${sectionGroup} (parentItemId=${parentItemId ?? "null"})`,
      );
    }
  }

  await prisma.$transaction(
    orderedItemIds.map((itemId, index) =>
      prisma.planItem.update({
        where: { id: itemId },
        data: { sortOrder: index * 100 },
      }),
    ),
  );

  await touchPlan(planId);
  await touchUserSeen(userId);
}

export const MOVE_ITEM_FAILED_MESSAGE =
  "Couldn't move this item. Reload and try again.";

async function collectDescendantItemIds(
  itemId: string,
  planId: string,
): Promise<Set<string>> {
  const descendants = new Set<string>();
  const queue = [itemId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.planItem.findMany({
      where: { planId, parentItemId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      descendants.add(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

export async function moveItemUnderTask(
  planId: string,
  userId: string,
  itemId: string,
  parentItemId: string,
) {
  await requirePlanForUser(planId, userId);

  if (itemId === parentItemId) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  const item = await prisma.planItem.findFirst({
    where: { id: itemId, planId },
    select: { id: true, parentItemId: true, type: true },
  });

  if (!item) {
    throw new PlanAccessError("Plan item not found");
  }

  if (item.parentItemId !== null) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  if (!isTaskItemType(item.type)) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  const parent = await prisma.planItem.findFirst({
    where: { id: parentItemId, planId },
    select: { id: true, parentItemId: true, type: true },
  });

  if (!parent) {
    throw new PlanAccessError("Plan item not found");
  }

  if (parent.parentItemId !== null) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  if (!isTaskItemType(parent.type)) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  const descendants = await collectDescendantItemIds(itemId, planId);
  if (descendants.has(parentItemId)) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  const lastSubtask = await prisma.planItem.findFirst({
    where: { planId, parentItemId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = lastSubtask ? lastSubtask.sortOrder + 100 : 0;

  await prisma.planItem.update({
    where: { id: itemId },
    data: { parentItemId, sortOrder },
  });

  await syncParentStatusFromSubtasks(parentItemId, userId);

  await touchPlan(planId);
  await touchUserSeen(userId);
}

export async function moveItemToRoot(
  planId: string,
  userId: string,
  itemId: string,
) {
  await requirePlanForUser(planId, userId);

  const item = await prisma.planItem.findFirst({
    where: { id: itemId, planId },
    select: { id: true, parentItemId: true, type: true },
  });

  if (!item) {
    throw new PlanAccessError("Plan item not found");
  }

  if (!item.parentItemId) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  if (!isTaskItemType(item.type)) {
    throw new PlanError(MOVE_ITEM_FAILED_MESSAGE);
  }

  const previousParentItemId = item.parentItemId;

  const lastRootTask = await prisma.planItem.findFirst({
    where: {
      planId,
      parentItemId: null,
      type: { in: [...TASK_ITEM_TYPES] },
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = lastRootTask ? lastRootTask.sortOrder + 100 : 0;

  await prisma.planItem.update({
    where: { id: itemId },
    data: { parentItemId: null, sortOrder },
  });

  await syncParentStatusFromSubtasks(previousParentItemId, userId);

  await touchPlan(planId);
  await touchUserSeen(userId);
}

/** Promote a subtask to the root Tasks section (last root task order). */
export const promoteSubtaskToRoot = moveItemToRoot;

export type MovePlanItemToDateResult = {
  sourcePlanId: string;
  sourceDate: string;
  targetPlanId: string;
  targetDate: string;
  targetDateLabel: string;
  movedOpenSubtasksOnly: boolean;
};

async function nextRootTaskSortOrder(planId: string): Promise<number> {
  const lastTask = await prisma.planItem.findFirst({
    where: {
      planId,
      parentItemId: null,
      type: { in: [...TASK_ITEM_TYPES] },
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return lastTask ? lastTask.sortOrder + 100 : 0;
}

function appendMovedNote(existingComment: string | null, targetDateLabel: string) {
  const movedLine = `Moved to ${targetDateLabel}`;
  const trimmed = existingComment?.trim();

  if (!trimmed) {
    return movedLine;
  }

  if (trimmed.includes(movedLine)) {
    return trimmed;
  }

  return `${trimmed}\n\n${movedLine}`;
}

type CopyablePlanItemFields = {
  title: string;
  description: string | null;
  type: PlanItemType;
  importance: PriorityLevel | null;
  urgency: PriorityLevel | null;
  timeHint: TimeHint | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  comment: string | null;
  shareable: boolean;
  sortOrder: number;
};

function isMovableSubtaskStatus(status: PlanItemStatus): boolean {
  return status === "OPEN" || status === "PARTIAL";
}

async function copyRootItemToPlan(
  userId: string,
  targetPlanId: string,
  item: CopyablePlanItemFields,
) {
  const rootSortOrder = await nextRootTaskSortOrder(targetPlanId);

  return createPlanItem({
    userId,
    planId: targetPlanId,
    title: item.title,
    description: item.description ?? undefined,
    type: item.type,
    status: "OPEN",
    importance: item.importance ?? undefined,
    urgency: item.urgency ?? undefined,
    timeHint: item.timeHint ?? undefined,
    startTime: item.startTime ?? undefined,
    endTime: item.endTime ?? undefined,
    durationMinutes: item.durationMinutes ?? undefined,
    comment: item.comment ?? undefined,
    shareable: item.shareable,
    sortOrder: rootSortOrder,
  });
}

async function copyParentWithMovableSubtasksToPlan(
  userId: string,
  targetPlanId: string,
  parent: CopyablePlanItemFields,
  movableSubtasks: CopyablePlanItemFields[],
) {
  const createdRoot = await copyRootItemToPlan(userId, targetPlanId, {
    ...parent,
    comment: null,
  });

  for (const subtask of movableSubtasks) {
    await createPlanItem({
      userId,
      planId: targetPlanId,
      parentItemId: createdRoot.id,
      title: subtask.title,
      description: subtask.description ?? undefined,
      type: subtask.type,
      status: "OPEN",
      importance: subtask.importance ?? undefined,
      urgency: subtask.urgency ?? undefined,
      timeHint: subtask.timeHint ?? undefined,
      startTime: subtask.startTime ?? undefined,
      endTime: subtask.endTime ?? undefined,
      durationMinutes: subtask.durationMinutes ?? undefined,
      comment: subtask.comment ?? undefined,
      shareable: subtask.shareable,
      sortOrder: subtask.sortOrder,
    });
  }

  return createdRoot;
}

function toCopyablePlanItemFields(
  item: CopyablePlanItemFields & { id?: string },
): CopyablePlanItemFields {
  return {
    title: item.title,
    description: item.description,
    type: item.type,
    importance: item.importance,
    urgency: item.urgency,
    timeHint: item.timeHint,
    startTime: item.startTime,
    endTime: item.endTime,
    durationMinutes: item.durationMinutes,
    comment: item.comment,
    shareable: item.shareable,
    sortOrder: item.sortOrder,
  };
}

export async function movePlanItemToDate(
  userId: string,
  itemId: string,
  targetDate: string,
  keepCopy = false,
): Promise<MovePlanItemToDateResult> {
  if (!isValidDateString(targetDate)) {
    throw new PlanError("Choose a valid date.");
  }

  const item = await prisma.planItem.findFirst({
    where: { id: itemId, plan: { userId } },
    include: {
      plan: true,
      subtasks: {
        orderBy: itemOrderBy,
      },
    },
  });

  if (!item) {
    throw new PlanAccessError("Plan item not found");
  }

  if (item.parentItemId) {
    throw new PlanError("Only root tasks can be moved to another date.");
  }

  if (!isTaskItemType(item.type)) {
    throw new PlanError("Only tasks can be moved to another date.");
  }

  if (item.plan.type !== PlanTypeEnum.DAY) {
    throw new PlanError("Only daily plan tasks can be moved to another date.");
  }

  const sourceDate = formatDateString(item.plan.dateStart);
  if (targetDate === sourceDate) {
    throw new PlanError("Choose a different date.");
  }

  const targetDateLabel = formatDayPlanDisplayDate(targetDate);
  const targetPlan = await getOrCreateDayPlan(
    userId,
    parseDateString(targetDate),
  );

  const parentFields = toCopyablePlanItemFields(item);
  const hasSubtasks = item.subtasks.length > 0;
  let movedOpenSubtasksOnly = false;

  if (!hasSubtasks) {
    await copyRootItemToPlan(userId, targetPlan.id, parentFields);

    if (!keepCopy) {
      await prisma.planItem.update({
        where: { id: itemId },
        data: {
          status: "MOVED",
          progressLevel: normalizeProgressForStatus("MOVED"),
          comment: appendMovedNote(item.comment, targetDateLabel),
        },
      });
    }
  } else {
    const movableSubtasks = item.subtasks.filter((subtask) =>
      isMovableSubtaskStatus(subtask.status),
    );

    if (movableSubtasks.length === 0) {
      throw new PlanError("No open subtasks to move.");
    }

    movedOpenSubtasksOnly = true;

    await copyParentWithMovableSubtasksToPlan(
      userId,
      targetPlan.id,
      parentFields,
      movableSubtasks.map(toCopyablePlanItemFields),
    );

    if (!keepCopy) {
      for (const subtask of movableSubtasks) {
        await prisma.planItem.update({
          where: { id: subtask.id },
          data: {
            status: "MOVED",
            progressLevel: normalizeProgressForStatus("MOVED"),
            comment: appendMovedNote(subtask.comment, targetDateLabel),
          },
        });
      }

      await syncParentStatusFromSubtasks(itemId, userId);
    }
  }

  await touchPlan(item.planId);
  await touchPlan(targetPlan.id);
  await touchUserSeen(userId);

  return {
    sourcePlanId: item.planId,
    sourceDate,
    targetPlanId: targetPlan.id,
    targetDate,
    targetDateLabel,
    movedOpenSubtasksOnly,
  };
}

export async function movePlanItem(
  planId: string,
  userId: string,
  itemId: string,
  direction: "up" | "down",
) {
  await requirePlanForUser(planId, userId);

  const item = await prisma.planItem.findFirst({
    where: { id: itemId, planId },
    select: {
      id: true,
      parentItemId: true,
      type: true,
      sortOrder: true,
    },
  });

  if (!item) {
    throw new PlanAccessError("Plan item not found");
  }

  const peers = await prisma.planItem.findMany({
    where: item.parentItemId
      ? { planId, parentItemId: item.parentItemId }
      : (() => {
          const section = getPlanItemSectionGroup(item.type);
          if (section === "intentions") {
            return { planId, parentItemId: null, type: "INTENTION" as const };
          }
          if (section === "notes") {
            return { planId, parentItemId: null, type: "NOTE" as const };
          }
          return {
            planId,
            parentItemId: null,
            type: { in: [...TASK_ITEM_TYPES] },
          };
        })(),
    select: { id: true, sortOrder: true, createdAt: true },
    orderBy: itemOrderBy,
  });

  const index = peers.findIndex((peer) => peer.id === itemId);
  if (index < 0) {
    throw new PlanAccessError("Plan item not found");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= peers.length) {
    throw new PlanAccessError("Cannot move item in that direction");
  }

  const current = peers[index];
  const target = peers[targetIndex];

  await prisma.$transaction([
    prisma.planItem.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.planItem.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  await touchPlan(planId);
  await touchUserSeen(userId);
}
