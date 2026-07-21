"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  addActivityTimerSessionNote,
  archiveActivityTimerPreset,
  ActivityTimerError,
  createActivityTimerPreset,
  deleteActivityTimerPreset,
  deleteActivityTimerSession,
  pauseActivityTimerSession,
  reorderActivityTimerPresets,
  restoreActivityTimerPreset,
  resumeActivityTimerSession,
  serializeActiveActivityTimerSessionWithNotes,
  startActivityTimerSession,
  stopActivityTimerSession,
  updateActivityTimerPreset,
  updateActivityTimerSession,
  updateActivityTimerSessionNote,
  type CreateActivityTimerPresetInput,
  type StartActivityTimerInput,
  type StopActivityTimerInput,
  type UpdateActivityTimerPresetInput,
  type UpdateActivityTimerSessionInput,
  type AddActivityTimerSessionNoteInput,
  type UpdateActivityTimerSessionNoteInput,
} from "@/lib/activity-timer";
import type {
  SerializedActiveActivityTimerSession,
  SerializedActivityTimerSessionNote,
} from "@/lib/activity-timer/constants";
import { serializeActivityTimerSessionNote } from "@/lib/activity-timer/session-notes";
import { getUserTimezone } from "@/lib/user-timezone";
import { canUseActivityTimerFeatures } from "@/lib/roles";

export type ActivityTimerActionResult =
  | { success: true }
  | { success: false; error: string };

export type ActivityTimerStopResult =
  | {
      success: true;
      outcome: "saved" | "discarded" | "idle";
      reason?: "under_minimum" | "explicit";
    }
  | { success: false; error: string };

export type ActivityTimerStartResult =
  | { success: true; activeSession: SerializedActiveActivityTimerSession }
  | { success: false; error: string };

export type ActivityTimerSessionNoteResult =
  | { success: true; note: SerializedActivityTimerSessionNote }
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
  revalidatePath("/settings");
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
      activeSession: await serializeActiveActivityTimerSessionWithNotes(
        created,
        session.user.id,
      ),
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
): Promise<ActivityTimerStopResult> {
  try {
    const session = await requireActivityTimerSession();
    const result = await stopActivityTimerSession(session.user.id, input);
    revalidateTimer();

    if (result.outcome === "saved") {
      return { success: true, outcome: "saved" };
    }

    if (result.outcome === "idle") {
      return { success: true, outcome: "idle" };
    }

    return {
      success: true,
      outcome: "discarded",
      reason: result.reason,
    };
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

export async function pauseActivityTimerAction(
  sessionId: string,
): Promise<ActivityTimerStartResult> {
  try {
    const session = await requireActivityTimerSession();
    const updated = await pauseActivityTimerSession(session.user.id, sessionId);
    revalidateTimer();
    return {
      success: true,
      activeSession: await serializeActiveActivityTimerSessionWithNotes(
        updated,
        session.user.id,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to pause timer.",
    };
  }
}

export async function resumeActivityTimerAction(
  sessionId: string,
): Promise<ActivityTimerStartResult> {
  try {
    const session = await requireActivityTimerSession();
    const updated = await resumeActivityTimerSession(session.user.id, sessionId);
    revalidateTimer();
    return {
      success: true,
      activeSession: await serializeActiveActivityTimerSessionWithNotes(
        updated,
        session.user.id,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to resume timer.",
    };
  }
}

export async function addActivityTimerSessionNoteAction(
  input: AddActivityTimerSessionNoteInput,
): Promise<ActivityTimerSessionNoteResult> {
  try {
    const session = await requireActivityTimerSession();
    const note = await addActivityTimerSessionNote(session.user.id, input);
    const timezone = await getUserTimezone(session.user.id);
    revalidateTimer();
    return {
      success: true,
      note: serializeActivityTimerSessionNote(note, timezone),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to save note.",
    };
  }
}

export async function updateActivityTimerSessionNoteAction(
  input: UpdateActivityTimerSessionNoteInput,
): Promise<ActivityTimerSessionNoteResult> {
  try {
    const session = await requireActivityTimerSession();
    const note = await updateActivityTimerSessionNote(session.user.id, input);
    const timezone = await getUserTimezone(session.user.id);
    revalidateTimer();
    return {
      success: true,
      note: serializeActivityTimerSessionNote(note, timezone),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to update note.",
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

export async function deleteActivityTimerSessionAction(
  sessionId: string,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await deleteActivityTimerSession(session.user.id, sessionId);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to delete session.",
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

export async function updateActivityTimerPresetAction(
  input: UpdateActivityTimerPresetInput,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await updateActivityTimerPreset(session.user.id, input);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to update activity.",
    };
  }
}

export async function restoreActivityTimerPresetAction(
  presetId: string,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await restoreActivityTimerPreset(session.user.id, presetId);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to restore activity.",
    };
  }
}

export async function reorderActivityTimerPresetsAction(
  presetIds: string[],
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await reorderActivityTimerPresets(session.user.id, presetIds);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to reorder activities.",
    };
  }
}

export async function deleteActivityTimerPresetAction(
  presetId: string,
): Promise<ActivityTimerActionResult> {
  try {
    const session = await requireActivityTimerSession();
    await deleteActivityTimerPreset(session.user.id, presetId);
    revalidateTimer();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ActivityTimerError
          ? error.message
          : "Failed to delete activity.",
    };
  }
}
