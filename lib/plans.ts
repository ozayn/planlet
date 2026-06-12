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
import { PlanType as PlanTypeEnum } from "@/app/generated/prisma/client";

import {
  getDayRange,
  getMonthRange,
  getTodayRange,
  getWeekRange,
  getYearRange,
} from "@/lib/dates";
import { canEditPlan, canViewPlan } from "@/lib/plan-sharing";
import { deriveParentStatusFromSubtasks } from "@/lib/parent-task-status";
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
  formatWeekPlanTitle,
  resolvePlanTitle,
} from "@/lib/plan-titles";
import { STALE_LIST_MESSAGE } from "@/lib/action-errors";
import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { prisma } from "@/lib/prisma";

const itemOrderBy = [
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
];

const planItemInclude = {
  subtasks: {
    orderBy: itemOrderBy,
    include: {
      themes: { include: { theme: true } },
      _count: { select: { comments: true } },
    },
  },
  themes: { include: { theme: true } },
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

  const item = await prisma.planItem.create({
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
    },
    include: planItemInclude,
  });

  if (input.parentItemId) {
    await syncParentStatusFromSubtasks(input.parentItemId, input.userId);
  }

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
) {
  const parent = await prisma.planItem.findFirst({
    where: { id: parentItemId, plan: { userId } },
    select: { id: true, status: true, progressLevel: true },
  });

  if (!parent) {
    return;
  }

  const subtasks = await prisma.planItem.findMany({
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

  await prisma.planItem.update({
    where: { id: parentItemId },
    data: {
      status: derivedStatus,
      progressLevel: normalizeProgressForStatus(
        derivedStatus,
        parent.progressLevel,
      ),
    },
  });
}

export async function updatePlanItemStatus(input: UpdatePlanItemStatusInput) {
  const item = await requirePlanItemForUser(input.itemId, input.userId);

  const progressLevel =
    input.progressLevel ??
    normalizeProgressForStatus(input.status, item.progressLevel);

  const updated = await prisma.planItem.update({
    where: { id: input.itemId },
    data: {
      status: input.status,
      progressLevel,
    },
    include: planItemInclude,
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
};

export async function updatePlanItem(input: UpdatePlanItemInput) {
  const item = await requirePlanItemForUser(input.itemId, input.userId);

  const { userId: _userId, itemId, status, progressLevel, ...fields } = input;

  const nextStatus = status ?? item.status;
  const nextProgress =
    progressLevel ??
    (status ? normalizeProgressForStatus(status, item.progressLevel) : undefined);

  const updated = await prisma.planItem.update({
    where: { id: itemId },
    data: {
      ...fields,
      ...(status ? { status: nextStatus } : {}),
      ...(nextProgress !== undefined ? { progressLevel: nextProgress } : {}),
    },
    include: planItemInclude,
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
