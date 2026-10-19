import { getTodayDateString, parseDateString } from "@/lib/dates";
import { createPlanItem, getOrCreateDayPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/user-timezone";

export type AutoAddPlacementDecision =
  | { action: "skip"; reason: "already_placed" }
  | { action: "create" };

/**
 * Pure gate used by ensure + tests: a ledger row for (priority, day)
 * means do not create again — even if the PlanItem was deleted.
 */
export function decideAutoAddPlacement(input: {
  hasPlacementForDay: boolean;
}): AutoAddPlacementDecision {
  if (input.hasPlacementForDay) {
    return { action: "skip", reason: "already_placed" };
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
 * For each active Focus Priority with autoAddToDailyPlan, ensure one task
 * exists on today's day plan (user timezone). Idempotent across refresh,
 * devices, and intentional deletes via FocusPriorityDailyPlacement.
 *
 * Does not backfill missed days.
 */
export async function ensureAutoFocusPriorityTasksForToday(
  userId: string,
  now = new Date(),
): Promise<{ dayDate: string; createdCount: number; skippedCount: number }> {
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
