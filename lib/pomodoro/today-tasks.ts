import { getTodayDateString, parseDateString } from "@/lib/dates";
import { isTaskItemType, TASK_ITEM_TYPES } from "@/lib/plan-item-sections";
import { getDayPlan } from "@/lib/plans";
import type { PomodoroTaskOption } from "@/lib/pomodoro/constants";
import {
  partitionPomodoroTaskOptions,
  toPomodoroTaskOption,
} from "@/lib/pomodoro/today-task-options";
import { prisma } from "@/lib/prisma";

/**
 * Today's Daily Plan root tasks for the Pomodoro selector.
 * Uses the Planner day-plan API and the user's timezone calendar day.
 */
export async function listTodayPlanTaskOptions(input: {
  userId: string;
  timezone: string;
  selectedTaskId?: string | null;
}): Promise<PomodoroTaskOption[]> {
  const todayString = getTodayDateString(input.timezone);
  const plan = await getDayPlan(input.userId, parseDateString(todayString));

  const fromPlan: PomodoroTaskOption[] = [];
  if (plan) {
    for (const item of plan.items) {
      if (!isTaskItemType(item.type)) {
        continue;
      }
      fromPlan.push(
        toPomodoroTaskOption({
          id: item.id,
          title: item.title,
          status: item.status,
        }),
      );
    }
  }

  const { incomplete, completed } = partitionPomodoroTaskOptions(fromPlan);
  const ordered = [...incomplete, ...completed];

  const selectedId = input.selectedTaskId?.trim() || null;
  if (!selectedId || ordered.some((task) => task.id === selectedId)) {
    return ordered;
  }

  const selected = await prisma.planItem.findFirst({
    where: {
      id: selectedId,
      plan: { userId: input.userId },
      type: { in: [...TASK_ITEM_TYPES] },
    },
    select: { id: true, title: true, status: true },
  });

  if (selected) {
    return [
      toPomodoroTaskOption({
        id: selected.id,
        title: selected.title,
        status: selected.status,
      }),
      ...ordered,
    ];
  }

  // Deleted task: keep association id for the active run without interrupting.
  return [
    toPomodoroTaskOption({
      id: selectedId,
      title: "Unavailable task",
      status: "DONE",
      missing: true,
    }),
    ...ordered,
  ];
}
