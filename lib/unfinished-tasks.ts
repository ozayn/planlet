import type { PlanItemStatus } from "@/app/generated/prisma/client";
import { subDays } from "date-fns";

import {
  formatDateString,
  formatDayPlanContextLabel,
  getDayRange,
  getMonthRange,
  getTodayRange,
  getWeekRange,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getAssignmentDisplayLabel } from "@/lib/theme-project-types";
import {
  UNFINISHED_TASK_STATUSES,
  type SerializedUnfinishedTask,
  type SerializedUnfinishedTaskReflection,
  type UnfinishedTaskRange,
  type UnfinishedTasksPageData,
} from "@/lib/unfinished-tasks/constants";

export {
  UNFINISHED_TASK_RANGE_OPTIONS,
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

function resolveRange(range: UnfinishedTaskRange, now = new Date()) {
  switch (range) {
    case "today":
      return getTodayRange(now);
    case "week":
      return getWeekRange(now);
    case "month":
      return getMonthRange(now);
    case "recent":
    default:
      return {
        start: getDayRange(subDays(now, 30)).start,
        end: getDayRange(now).end,
      };
  }
}

export function normalizeUnfinishedTaskRange(
  value: string | null | undefined,
): UnfinishedTaskRange {
  if (
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "recent"
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
): Promise<UnfinishedTasksPageData> {
  const { start, end } = resolveRange(range);

  const items = await prisma.planItem.findMany({
    where: {
      status: { in: [...UNFINISHED_TASK_STATUSES] },
      type: { notIn: ["NOTE", "INTENTION"] },
      plan: {
        userId,
        type: "DAY",
        dateStart: {
          gte: start,
          lte: end,
        },
      },
    },
    orderBy: [
      { plan: { dateStart: "desc" } },
      { parentItemId: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      plan: { select: { id: true, dateStart: true } },
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

  const assignmentFilters = new Map<string, string>();
  const tasks = items.map((item): SerializedUnfinishedTask => {
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
      planDateLabel: formatDayPlanContextLabel(item.plan.dateStart),
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
      latestReflection: latestReflection(item.reflections),
    };
  });

  return {
    range,
    tasks,
    assignmentFilters: Array.from(assignmentFilters.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
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
