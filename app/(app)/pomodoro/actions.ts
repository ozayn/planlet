"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  adjustPomodoroRemaining,
  completePomodoroPhase,
  pausePomodoroRun,
  PomodoroError,
  reconcilePomodoroRun,
  resumePomodoroRun,
  skipPomodoroBreak,
  startPomodoroBreak,
  startPomodoroFocus,
  stopPomodoroRun,
  updatePomodoroAssociation,
  upsertPomodoroPreferences,
} from "@/lib/pomodoro";
import {
  createPomodoroActivity,
  deletePomodoroActivity,
  renamePomodoroActivity,
  reorderPomodoroActivities,
} from "@/lib/pomodoro/activities";
import type { PomodoroPreferences } from "@/lib/pomodoro/constants";
import { canUsePomodoroFeatures } from "@/lib/roles";

async function requirePomodoroUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUsePomodoroFeatures(session.user)) {
    throw new PomodoroError("Pomodoro is not available.");
  }

  return userId;
}

function revalidatePomodoro() {
  revalidatePath("/pomodoro");
  revalidatePath("/settings/pomodoro");
}

export async function startPomodoroFocusAction(input?: {
  taskId?: string | null;
  customTitle?: string | null;
}) {
  try {
    const userId = await requirePomodoroUser();
    const activeRun = await startPomodoroFocus(userId, input ?? {});
    revalidatePomodoro();
    return { success: true as const, activeRun };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not start focus.",
    };
  }
}

export async function startPomodoroBreakAction() {
  try {
    const userId = await requirePomodoroUser();
    const activeRun = await startPomodoroBreak(userId);
    revalidatePomodoro();
    return { success: true as const, activeRun };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not start break.",
    };
  }
}

export async function pausePomodoroAction() {
  try {
    const userId = await requirePomodoroUser();
    const activeRun = await pausePomodoroRun(userId);
    revalidatePomodoro();
    return { success: true as const, activeRun };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not pause.",
    };
  }
}

export async function resumePomodoroAction() {
  try {
    const userId = await requirePomodoroUser();
    const activeRun = await resumePomodoroRun(userId);
    revalidatePomodoro();
    return { success: true as const, activeRun };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not resume.",
    };
  }
}

export async function stopPomodoroAction() {
  try {
    const userId = await requirePomodoroUser();
    const result = await stopPomodoroRun(userId);
    revalidatePomodoro();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not stop.",
    };
  }
}

export async function skipPomodoroBreakAction(input?: {
  transitionToken?: string | null;
}) {
  try {
    const userId = await requirePomodoroUser();
    const result = await skipPomodoroBreak(userId, input ?? {});
    revalidatePomodoro();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not skip break.",
    };
  }
}

export async function adjustPomodoroRemainingAction(input: {
  remainingSeconds?: number | null;
  deltaSeconds?: number | null;
}) {
  try {
    const userId = await requirePomodoroUser();
    const result = await adjustPomodoroRemaining(userId, input);
    revalidatePomodoro();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not adjust the timer.",
    };
  }
}

export async function completePomodoroPhaseAction(input?: {
  transitionToken?: string | null;
}) {
  try {
    const userId = await requirePomodoroUser();
    const result = await completePomodoroPhase(userId, input ?? {});
    revalidatePomodoro();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not complete phase.",
    };
  }
}

export async function reconcilePomodoroAction() {
  try {
    const userId = await requirePomodoroUser();
    const result = await reconcilePomodoroRun(userId);
    if (result) {
      revalidatePomodoro();
    }
    return { success: true as const, result };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not reconcile session.",
    };
  }
}

export async function updatePomodoroAssociationAction(input: {
  taskId?: string | null;
  customTitle?: string | null;
}) {
  try {
    const userId = await requirePomodoroUser();
    const activeRun = await updatePomodoroAssociation(userId, input);
    revalidatePomodoro();
    return { success: true as const, activeRun };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not update task.",
    };
  }
}

export async function updatePomodoroPreferencesAction(
  input: Partial<PomodoroPreferences>,
) {
  try {
    const userId = await requirePomodoroUser();
    const preferences = await upsertPomodoroPreferences(userId, input);
    revalidatePomodoro();
    return { success: true as const, preferences };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not save settings.",
    };
  }
}

export async function createPomodoroActivityAction(title: string) {
  try {
    const userId = await requirePomodoroUser();
    const activity = await createPomodoroActivity(userId, title);
    revalidatePomodoro();
    return { success: true as const, activity };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not add activity.",
    };
  }
}

export async function renamePomodoroActivityAction(
  activityId: string,
  title: string,
) {
  try {
    const userId = await requirePomodoroUser();
    const activity = await renamePomodoroActivity(userId, activityId, title);
    revalidatePomodoro();
    return { success: true as const, activity };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not rename activity.",
    };
  }
}

export async function deletePomodoroActivityAction(activityId: string) {
  try {
    const userId = await requirePomodoroUser();
    await deletePomodoroActivity(userId, activityId);
    revalidatePomodoro();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not delete activity.",
    };
  }
}

export async function reorderPomodoroActivitiesAction(orderedIds: string[]) {
  try {
    const userId = await requirePomodoroUser();
    const activities = await reorderPomodoroActivities(userId, orderedIds);
    revalidatePomodoro();
    return { success: true as const, activities };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not reorder activities.",
    };
  }
}
