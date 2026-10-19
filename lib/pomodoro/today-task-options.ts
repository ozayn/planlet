import type { PlanItemStatus } from "@/app/generated/prisma/client";

import type { PomodoroTaskOption } from "@/lib/pomodoro/constants";

const INCOMPLETE_STATUSES = new Set<PlanItemStatus>([
  "OPEN",
  "PARTIAL",
  "NOT_DONE",
]);

export function isIncompletePomodoroTaskStatus(
  status: PlanItemStatus | string,
): boolean {
  return INCOMPLETE_STATUSES.has(status as PlanItemStatus);
}

export function partitionPomodoroTaskOptions(tasks: PomodoroTaskOption[]): {
  incomplete: PomodoroTaskOption[];
  completed: PomodoroTaskOption[];
} {
  const incomplete: PomodoroTaskOption[] = [];
  const completed: PomodoroTaskOption[] = [];

  for (const task of tasks) {
    if (task.completed) {
      completed.push(task);
    } else {
      incomplete.push(task);
    }
  }

  return { incomplete, completed };
}

export function toPomodoroTaskOption(input: {
  id: string;
  title: string;
  status: PlanItemStatus | string;
  missing?: boolean;
}): PomodoroTaskOption {
  return {
    id: input.id,
    title: input.title.trim() || "Untitled task",
    completed: !isIncompletePomodoroTaskStatus(input.status),
    missing: input.missing,
  };
}
