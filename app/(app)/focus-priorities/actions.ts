"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth-roles";
import {
  FocusPriorityAuthError,
  FocusPriorityError,
  addFocusPriorityToToday,
  archiveFocusPriority,
  assertFocusPrioritiesAdminAccess,
  confirmFocusPriorityTaskDraft,
  createFocusPriority,
  ensureDefaultFocusPriorities,
  reorderFocusPriorities,
  restoreFocusPriority,
  updateFocusPriority,
  type FocusPriorityTaskDraftInput,
  type FocusPriorityWriteInput,
} from "@/lib/focus-priorities";

async function requireAdminUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new FocusPriorityAuthError();
  }
  assertFocusPrioritiesAdminAccess(session.user.role);
  return userId;
}

function revalidateFocusPriorityPaths() {
  revalidatePath("/focus-priorities");
  revalidatePath("/settings/planner");
  revalidatePath("/today");
  revalidatePath("/plans");
}

function revalidateTodayPlanPaths(planId: string, dayDate: string) {
  revalidateFocusPriorityPaths();
  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/plans/day/${dayDate}`);
  revalidatePath("/today", "layout");
  revalidatePath("/plans", "layout");
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof FocusPriorityAuthError ||
    error instanceof FocusPriorityError
  ) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export async function listFocusPrioritiesAction(includeArchived = true) {
  try {
    const userId = await requireAdminUserId();
    const priorities = await ensureDefaultFocusPriorities(userId);
    return {
      success: true as const,
      priorities: includeArchived
        ? priorities
        : priorities.filter((priority) => !priority.archivedAt),
    };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not load Focus Priorities."),
    };
  }
}

export async function createFocusPriorityAction(input: FocusPriorityWriteInput) {
  try {
    const userId = await requireAdminUserId();
    const priority = await createFocusPriority(userId, input);
    revalidateFocusPriorityPaths();
    return { success: true as const, priority };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not add Focus Priority."),
    };
  }
}

export async function updateFocusPriorityAction(
  priorityId: string,
  input: FocusPriorityWriteInput,
) {
  try {
    const userId = await requireAdminUserId();
    const priority = await updateFocusPriority(userId, priorityId, input);
    revalidateFocusPriorityPaths();
    return { success: true as const, priority };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not update Focus Priority."),
    };
  }
}

export async function archiveFocusPriorityAction(priorityId: string) {
  try {
    const userId = await requireAdminUserId();
    const priority = await archiveFocusPriority(userId, priorityId);
    revalidateFocusPriorityPaths();
    return { success: true as const, priority };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not archive Focus Priority."),
    };
  }
}

export async function restoreFocusPriorityAction(priorityId: string) {
  try {
    const userId = await requireAdminUserId();
    const priority = await restoreFocusPriority(userId, priorityId);
    revalidateFocusPriorityPaths();
    return { success: true as const, priority };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not restore Focus Priority."),
    };
  }
}

export async function reorderFocusPrioritiesAction(orderedIds: string[]) {
  try {
    const userId = await requireAdminUserId();
    const priorities = await reorderFocusPriorities(userId, orderedIds);
    revalidateFocusPriorityPaths();
    return { success: true as const, priorities };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not reorder Focus Priorities."),
    };
  }
}

export async function confirmFocusPriorityTaskDraftAction(
  input: FocusPriorityTaskDraftInput,
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId || !isAdminRole(session.user.role)) {
      return { success: false as const, error: "Not authorized." };
    }

    const result = await confirmFocusPriorityTaskDraft(userId, input);
    revalidateTodayPlanPaths(result.planId, result.dayDate);
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not add task to today."),
    };
  }
}

/** @deprecated Prefer confirmFocusPriorityTaskDraftAction. */
export async function addFocusPriorityToTodayAction(priorityId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId || !isAdminRole(session.user.role)) {
      return { success: false as const, error: "Not authorized." };
    }

    const result = await addFocusPriorityToToday(userId, priorityId);
    revalidateTodayPlanPaths(result.planId, result.dayDate);
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: toErrorMessage(error, "Could not add priority to today."),
    };
  }
}
