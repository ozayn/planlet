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
import { normalizeProgressForStatus } from "@/lib/plan-status";
import {
  formatDayPlanTitle,
  formatWeekPlanTitle,
  resolvePlanTitle,
} from "@/lib/plan-titles";
import { touchPlan } from "@/lib/touch-plan";
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

  return prisma.plan.create({
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

  return prisma.plan.create({
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

  return prisma.plan.update({
    where: { id: planId },
    data: { title: resolvedTitle },
    select: { id: true, title: true, type: true, dateStart: true },
  });
}

export async function createPlan(input: CreatePlanInput) {
  return prisma.plan.create({
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

  await touchPlan(input.planId);

  return item;
}

export type UpdatePlanItemStatusInput = {
  userId: string;
  itemId: string;
  status: PlanItemStatus;
  progressLevel?: number;
};

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

  await touchPlan(item.planId);

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

  await touchPlan(item.planId);

  return updated;
}

export async function deletePlanItem(itemId: string, userId: string) {
  const item = await requirePlanItemForUser(itemId, userId);

  const deleted = await prisma.planItem.delete({
    where: { id: itemId },
  });

  await touchPlan(item.planId);

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

  return plan;
}

export async function reorderPlanItems(
  planId: string,
  userId: string,
  orderedItemIds: string[],
) {
  await requirePlanForUser(planId, userId);

  const rootItems = await prisma.planItem.findMany({
    where: { planId, parentItemId: null },
    select: { id: true },
  });

  const rootIds = new Set(rootItems.map((item) => item.id));

  if (orderedItemIds.length !== rootItems.length) {
    throw new PlanAccessError("Invalid item order");
  }

  for (const itemId of orderedItemIds) {
    if (!rootIds.has(itemId)) {
      throw new PlanAccessError("Invalid item order");
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
}
