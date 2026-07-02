"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/require-auth";
import {
  movePlanItemToDate,
  PlanError,
  updatePlanItemStatus,
} from "@/lib/plans";
import {
  addPlanItemReflection,
  UnfinishedTasksError,
} from "@/lib/unfinished-tasks";
import { touchUserSeenSafely } from "@/lib/user-activity";

export type UnfinishedTaskActionResult =
  | { success: true }
  | { success: false; error: string };

export type MoveUnfinishedTaskResult =
  | {
      success: true;
      targetDate: string;
      targetDateLabel: string;
      targetPlanHref: string;
      movedOpenSubtasksOnly: boolean;
    }
  | { success: false; error: string };

function revalidateUnfinishedSurfaces() {
  revalidatePath("/unfinished");
  revalidatePath("/today");
  revalidatePath("/plans");
}

export async function markUnfinishedTaskDoneAction(input: {
  itemId: string;
}): Promise<UnfinishedTaskActionResult> {
  try {
    const userId = await requireUserId();
    await updatePlanItemStatus({
      userId,
      itemId: input.itemId,
      status: "DONE",
    });
    await touchUserSeenSafely(userId);
    revalidateUnfinishedSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PlanError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't mark this task done.",
    };
  }
}

export async function moveUnfinishedTaskToDateAction(input: {
  itemId: string;
  targetDate: string;
}): Promise<MoveUnfinishedTaskResult> {
  try {
    const userId = await requireUserId();
    const result = await movePlanItemToDate(
      userId,
      input.itemId,
      input.targetDate,
      false,
    );
    await touchUserSeenSafely(userId);
    revalidateUnfinishedSurfaces();
    revalidatePath(`/plans/day/${result.sourceDate}`);
    revalidatePath(`/plans/day/${result.targetDate}`);
    return {
      success: true,
      targetDate: result.targetDate,
      targetDateLabel: result.targetDateLabel,
      targetPlanHref: `/plans/day/${result.targetDate}`,
      movedOpenSubtasksOnly: result.movedOpenSubtasksOnly,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PlanError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't move this task.",
    };
  }
}

export async function addUnfinishedTaskReflectionAction(input: {
  itemId: string;
  reason?: string | null;
  note?: string | null;
}): Promise<UnfinishedTaskActionResult> {
  try {
    const userId = await requireUserId();
    await addPlanItemReflection({
      userId,
      planItemId: input.itemId,
      reason: input.reason,
      note: input.note,
    });
    await touchUserSeenSafely(userId);
    revalidateUnfinishedSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof UnfinishedTasksError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't save this reflection.",
    };
  }
}
