import { getTodayDateString, parseDateString } from "@/lib/dates";
import { evaluateProgramWindow } from "@/lib/focus-priorities/program-window";
import { createPlanItem, getOrCreateDayPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/user-timezone";

export type AutoAddPlacementDecision =
  | {
      action: "skip";
      reason:
        | "already_placed"
        | "not_configured"
        | "before_start"
        | "after_end";
    }
  | { action: "create" };

/**
 * Pure gate used by ensure + tests: ledger + optional program window.
 * Outside the window (or before dates are set for windowed priorities),
 * no task is created — existing history is left alone.
 */
export function decideAutoAddPlacement(input: {
  hasPlacementForDay: boolean;
  dayDate: string;
  programWindowMonths?: number | null;
  programStartsOn?: string | null;
  programEndsOn?: string | null;
}): AutoAddPlacementDecision {
  if (input.hasPlacementForDay) {
    return { action: "skip", reason: "already_placed" };
  }

  const window = evaluateProgramWindow({
    dayDate: input.dayDate,
    programWindowMonths: input.programWindowMonths,
    programStartsOn: input.programStartsOn,
    programEndsOn: input.programEndsOn,
  });
  if (!window.active) {
    return { action: "skip", reason: window.reason };
  }

  return { action: "create" };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Reserve today's placement row before creating a task so concurrent
 * devices converge on one attempt. Returns false when already reserved.
 */
async function claimDailyPlacement(input: {
  userId: string;
  focusPriorityId: string;
  dayDate: string;
}): Promise<boolean> {
  try {
    await prisma.focusPriorityDailyPlacement.create({
      data: {
        userId: input.userId,
        focusPriorityId: input.focusPriorityId,
        dayDate: input.dayDate,
        planItemId: null,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Record (or refresh) the daily placement for a single manually added task.
 * Does not create other priorities' tasks. Upserts so a prior auto-add row
 * (including after an intentional delete) can point at the new item.
 */
export async function linkFocusPriorityDailyPlacement(input: {
  userId: string;
  focusPriorityId: string;
  dayDate: string;
  planItemId: string;
}): Promise<void> {
  await prisma.focusPriorityDailyPlacement.upsert({
    where: {
      userId_focusPriorityId_dayDate: {
        userId: input.userId,
        focusPriorityId: input.focusPriorityId,
        dayDate: input.dayDate,
      },
    },
    create: {
      userId: input.userId,
      focusPriorityId: input.focusPriorityId,
      dayDate: input.dayDate,
      planItemId: input.planItemId,
    },
    update: {
      planItemId: input.planItemId,
    },
  });
}

export type EnsureAutomaticDailyPriorityTasksResult = {
  dayDate: string;
  createdCount: number;
  skippedCount: number;
};

/**
 * Automatic daily addition only.
 *
 * For each active Focus Priority with autoAddToDailyPlan, ensure one task
 * exists on today's day plan (user timezone). Idempotent across refresh,
 * devices, and intentional deletes via FocusPriorityDailyPlacement.
 *
 * Must not be invoked from manual "Add to today" — that path uses
 * addSingleFocusPriorityToToday for exactly one priorityId.
 *
 * Does not backfill missed days.
 */
export async function ensureAutomaticDailyPriorityTasks(
  userId: string,
  now = new Date(),
): Promise<EnsureAutomaticDailyPriorityTasksResult> {
  const timezone = await getUserTimezone(userId);
  const dayDate = getTodayDateString(timezone, now);
  const plan = await getOrCreateDayPlan(userId, parseDateString(dayDate));

  const priorities = await prisma.focusPriority.findMany({
    where: {
      userId,
      archivedAt: null,
      autoAddToDailyPlan: true,
      lifeArea: { archivedAt: null },
    },
    select: {
      id: true,
      lifeAreaId: true,
      suggestedTaskTitle: true,
      defaultDurationMinutes: true,
      programWindowMonths: true,
      programStartsOn: true,
      programEndsOn: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (priorities.length === 0) {
    return { dayDate, createdCount: 0, skippedCount: 0 };
  }

  const placements = await prisma.focusPriorityDailyPlacement.findMany({
    where: {
      userId,
      dayDate,
      focusPriorityId: { in: priorities.map((priority) => priority.id) },
    },
    select: { focusPriorityId: true },
  });
  const placedIds = new Set(
    placements.map((placement) => placement.focusPriorityId),
  );

  let createdCount = 0;
  let skippedCount = 0;

  for (const priority of priorities) {
    const decision = decideAutoAddPlacement({
      hasPlacementForDay: placedIds.has(priority.id),
      dayDate,
      programWindowMonths: priority.programWindowMonths,
      programStartsOn: priority.programStartsOn,
      programEndsOn: priority.programEndsOn,
    });
    if (decision.action === "skip") {
      skippedCount += 1;
      continue;
    }

    const claimed = await claimDailyPlacement({
      userId,
      focusPriorityId: priority.id,
      dayDate,
    });
    if (!claimed) {
      placedIds.add(priority.id);
      skippedCount += 1;
      continue;
    }

    const item = await createPlanItem({
      userId,
      planId: plan.id,
      title: priority.suggestedTaskTitle,
      type: "TASK",
      durationMinutes: priority.defaultDurationMinutes ?? undefined,
      primaryLifeAreaId: priority.lifeAreaId,
    });

    await prisma.focusPriorityDailyPlacement.update({
      where: {
        userId_focusPriorityId_dayDate: {
          userId,
          focusPriorityId: priority.id,
          dayDate,
        },
      },
      data: { planItemId: item.id },
    });

    placedIds.add(priority.id);
    createdCount += 1;
  }

  return { dayDate, createdCount, skippedCount };
}

/** @deprecated Prefer ensureAutomaticDailyPriorityTasks. */
export const ensureAutoFocusPriorityTasksForToday =
  ensureAutomaticDailyPriorityTasks;
