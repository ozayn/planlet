import type {
  PlanItemStatus,
  PlanType,
} from "@/app/generated/prisma/client";
import { subDays } from "date-fns";

import {
  formatDateString,
  formatPlanCardDate,
  getDayRange,
  getMonthRange,
  getTodayRange,
  getWeekRange,
  type DateRange,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getAssignmentDisplayLabel } from "@/lib/theme-project-types";
import { buildUnfinishedTaskMetadataLine } from "@/lib/unfinished-tasks/metadata";
import {
  UNFINISHED_TASK_ALL_RANGE_LIMIT,
  UNFINISHED_TASK_RECENT_DAYS,
  UNFINISHED_TASK_STATUSES,
  type SerializedUnfinishedTask,
  type SerializedUnfinishedTaskReflection,
  type UnfinishedTaskRange,
  type UnfinishedTasksPageData,
} from "@/lib/unfinished-tasks/constants";

export {
  UNFINISHED_TASK_ALL_RANGE_LIMIT,
  UNFINISHED_TASK_RANGE_OPTIONS,
  UNFINISHED_TASK_RECENT_DAYS,
  UNFINISHED_TASK_REFLECTION_REASONS,
  UNFINISHED_TASK_STATUS_FILTERS,
  UNFINISHED_TASK_STATUSES,
  type SerializedUnfinishedTask,
  type SerializedUnfinishedTaskReflection,
  type UnfinishedTaskAssignmentFilter,
  type UnfinishedTaskRange,
  type UnfinishedTaskReflectionReason,
  type UnfinishedTasksPageData,
} from "@/lib/unfinished-tasks/constants";

export class UnfinishedTasksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnfinishedTasksError";
  }
}

export function resolveUnfinishedTaskRange(
  range: Exclude<UnfinishedTaskRange, "all">,
  now = new Date(),
): DateRange {
  switch (range) {
    case "today":
      return getTodayRange(now);
    case "week":
      return getWeekRange(now);
    case "month":
      return getMonthRange(now);
    case "recent":
      return {
        start: getDayRange(subDays(now, UNFINISHED_TASK_RECENT_DAYS)).start,
        end: getDayRange(now).end,
      };
  }
}

export function planTypesForUnfinishedTaskRange(
  range: UnfinishedTaskRange,
): PlanType[] {
  switch (range) {
    case "today":
      return ["DAY"];
    case "week":
      return ["DAY", "WEEK"];
    case "month":
      return ["DAY", "WEEK", "MONTH"];
    case "recent":
      return ["DAY", "WEEK", "MONTH"];
    case "all":
      return ["DAY", "WEEK", "MONTH", "YEAR"];
  }
}

export function unfinishedTaskPlanDateFilter(start: Date, end: Date) {
  return {
    dateStart: { lte: end },
    dateEnd: { gte: start },
  };
}

export function unfinishedTaskPlanWhere(
  userId: string,
  range: UnfinishedTaskRange,
  now = new Date(),
) {
  const planTypes = planTypesForUnfinishedTaskRange(range);
  const base = {
    userId,
    type: { in: planTypes },
  };

  if (range === "all") {
    return base;
  }

  const { start, end } = resolveUnfinishedTaskRange(range, now);
  return {
    ...base,
    ...unfinishedTaskPlanDateFilter(start, end),
  };
}

export function normalizeUnfinishedTaskRange(
  value: string | null | undefined,
): UnfinishedTaskRange {
  if (
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "recent" ||
    value === "all"
  ) {
    return value;
  }

  return "week";
}

function assignmentFilterValue(item: {
  themeId: string | null;
  projectId: string | null;
}): string | null {
  if (item.projectId) {
    return `project:${item.projectId}`;
  }

  if (item.themeId) {
    return `theme:${item.themeId}`;
  }

  return null;
}

function latestReflection(
  reflections: Array<{
    id: string;
    reason: string | null;
    note: string | null;
    createdAt: Date;
  }>,
): SerializedUnfinishedTaskReflection | null {
  const reflection = reflections[0];
  if (!reflection) {
    return null;
  }

  return {
    id: reflection.id,
    reason: reflection.reason,
    note: reflection.note,
    createdAt: reflection.createdAt.toISOString(),
  };
}

export async function getUnfinishedTasksPageData(
  userId: string,
  range: UnfinishedTaskRange,
  now = new Date(),
): Promise<UnfinishedTasksPageData> {
  const planWhere = unfinishedTaskPlanWhere(userId, range, now);
  const queryLimit =
    range === "all" ? UNFINISHED_TASK_ALL_RANGE_LIMIT + 1 : undefined;

  if (process.env.NODE_ENV === "development") {
    console.info("[unfinished-tasks]", {
      range,
      planWhere,
      queryLimit: queryLimit ?? null,
      userId,
    });
  }

  const items = await prisma.planItem.findMany({
    where: {
      status: { in: [...UNFINISHED_TASK_STATUSES] },
      type: { notIn: ["NOTE", "INTENTION"] },
      plan: planWhere,
    },
    orderBy: [
      { plan: { dateStart: "desc" } },
      { parentItemId: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    ...(queryLimit ? { take: queryLimit } : {}),
    include: {
      plan: {
        select: {
          id: true,
          type: true,
          dateStart: true,
          dateEnd: true,
        },
      },
      theme: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      parentItem: { select: { id: true, title: true } },
      subtasks: {
        select: { id: true, status: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      reflections: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          reason: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  const truncated =
    range === "all" && items.length > UNFINISHED_TASK_ALL_RANGE_LIMIT;
  const visibleItems = truncated
    ? items.slice(0, UNFINISHED_TASK_ALL_RANGE_LIMIT)
    : items;

  if (process.env.NODE_ENV === "development") {
    console.info("[unfinished-tasks] results", {
      range,
      itemCount: visibleItems.length,
      truncated,
      statuses: [...new Set(visibleItems.map((item) => item.status))],
    });
  }

  const assignmentFilters = new Map<string, string>();
  const tasks = visibleItems.map((item): SerializedUnfinishedTask => {
    const planDate = formatDateString(item.plan.dateStart);
    const assignmentLabel = getAssignmentDisplayLabel({
      themeName: item.theme?.name,
      projectName: item.project?.name,
    });
    const filterValue = assignmentFilterValue({
      themeId: item.themeId,
      projectId: item.projectId,
    });

    if (filterValue && assignmentLabel) {
      assignmentFilters.set(filterValue, assignmentLabel);
    }

    return {
      id: item.id,
      planId: item.planId,
      title: item.title,
      status: item.status,
      planDate,
      planDateLabel: formatPlanCardDate({
        type: item.plan.type,
        dateStart: item.plan.dateStart,
        dateEnd: item.plan.dateEnd,
      }),
      themeId: item.themeId,
      themeName: item.theme?.name ?? null,
      projectId: item.projectId,
      projectName: item.project?.name ?? null,
      assignmentLabel,
      parentTitle: item.parentItem?.title ?? null,
      isSubtask: Boolean(item.parentItemId),
      subtaskCount: item.subtasks.length,
      movableSubtaskCount: item.subtasks.filter((subtask) =>
        (UNFINISHED_TASK_STATUSES as readonly PlanItemStatus[]).includes(
          subtask.status,
        ),
      ).length,
      metadataLine: buildUnfinishedTaskMetadataLine({
        status: item.status,
        planDate,
        assignmentLabel,
        parentTitle: item.parentItem?.title ?? null,
        comment: item.comment,
      }),
      latestReflection: latestReflection(item.reflections),
    };
  });

  return {
    range,
    tasks,
    assignmentFilters: Array.from(assignmentFilters.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    ...(truncated
      ? {
          truncated: true,
          limit: UNFINISHED_TASK_ALL_RANGE_LIMIT,
        }
      : {}),
  };
}

export async function addPlanItemReflection(input: {
  userId: string;
  planItemId: string;
  reason?: string | null;
  note?: string | null;
}) {
  const reason = input.reason?.trim() || null;
  const note = input.note?.trim() || null;

  if (!reason && !note) {
    throw new UnfinishedTasksError("Add a reason or note.");
  }

  const item = await prisma.planItem.findFirst({
    where: { id: input.planItemId, plan: { userId: input.userId } },
    select: { id: true },
  });

  if (!item) {
    throw new UnfinishedTasksError("Task not found.");
  }

  return prisma.planItemReflection.create({
    data: {
      planItemId: input.planItemId,
      userId: input.userId,
      reason,
      note,
    },
  });
}
