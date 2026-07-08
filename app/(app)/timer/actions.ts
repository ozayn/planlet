"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  archiveActivityTimerPreset,
  ActivityTimerError,
  createActivityTimerPreset,
  serializeActiveActivityTimerSession,
  startActivityTimerSession,
  stopActivityTimerSession,
  updateActivityTimerSession,
  type CreateActivityTimerPresetInput,
  type StartActivityTimerInput,
  type StopActivityTimerInput,
  type UpdateActivityTimerSessionInput,
} from "@/lib/activity-timer";
import type { SerializedActiveActivityTimerSession } from "@/lib/activity-timer/constants";
import { canUseActivityTimerFeatures } from "@/lib/roles";

export type ActivityTimerActionResult =
  | { success: true }
  | { success: false; error: string };

export type ActivityTimerStartResult =
  | { success: true; activeSession: SerializedActiveActivityTimerSession }
  | { success: false; error: string };

async function requireActivityTimerSession() {
  const session = await auth();

  if (!session?.user?.id || !canUseActivityTimerFeatures(session.user)) {
    throw new ActivityTimerError("Not authorized.");
  }

  return session;
}

function revalidateTimer() {
  revalidatePath("/timer");
  revalidatePath("/", "layout");
}

export async function startActivityTimerAction(
  input: StartActivityTimerInput,
): Promise<ActivityTimerStartResult> {
  try {
    const session = await requireActivityTimerSession();
    const created = await startActivityTimerSession(session.user.id, input);
    revalidateTimer();
    return {
      success: true,
      activeSession: serializeActiveActivityTimerSession(created),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to start timer.",
    };
  }
}

export async function stopActivityTimerAction(
  input: StopActivityTimerInput,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await stopActivityTimerSession(session.user.id, input);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to stop timer.",
    };
  }
}

export async function updateActivityTimerSessionAction(
  input: UpdateActivityTimerSessionInput,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await updateActivityTimerSession(session.user.id, input);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to update session.",
    };
  }
}

export async function createActivityTimerPresetAction(
  input: CreateActivityTimerPresetInput,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await createActivityTimerPreset(session.user.id, input);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to save activity.",
    };
  }
}

export async function archiveActivityTimerPresetAction(
  presetId: string,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await archiveActivityTimerPreset(session.user.id, presetId);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to remove activity.",
    };
  }
}
