"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  addActivityTimerSessionNote,
  archiveActivityTimerPreset,
  ActivityTimerError,
  createActivityTimerPreset,
  serializeActiveActivityTimerSessionWithNotes,
  startActivityTimerSession,
  stopActivityTimerSession,
  updateActivityTimerSession,
  updateActivityTimerSessionNote,
  type CreateActivityTimerPresetInput,
  type StartActivityTimerInput,
  type StopActivityTimerInput,
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
