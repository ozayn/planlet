"use server";

import type {
  FeedbackArea,
  FeedbackPriority,
  FeedbackStatus,
} from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createFeedback,
  deleteFeedback,
  FeedbackError,
  updateFeedbackPriority,
  updateFeedbackStatus,
  type SerializedFeedback,
} from "@/lib/feedback";
import { touchUserSeenSafely } from "@/lib/user-activity";

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true } & T)
  | { success: false; error: string };

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new FeedbackError("Not signed in.");
  }

  return userId;
}

export async function submitFeedbackAction(input: {
  area: FeedbackArea;
  body: string;
  title?: string | null;
  pagePath?: string | null;
  priority?: FeedbackPriority;
}): Promise<ActionResult<{ feedback: SerializedFeedback }>> {
  const userId = await requireUserId();

  try {
    const feedback = await createFeedback(userId, input);
    await touchUserSeenSafely(userId);
    revalidatePath("/feedback");
    revalidatePath("/admin/feedback");
    return { success: true, feedback };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof FeedbackError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save feedback.",
    };
  }
}

export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<ActionResult<{ feedback: SerializedFeedback }>> {
  const userId = await requireUserId();

  try {
    const feedback = await updateFeedbackStatus(userId, feedbackId, status);
    await touchUserSeenSafely(userId);
    revalidatePath("/admin/feedback");
    return { success: true, feedback };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof FeedbackError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update status.",
    };
  }
}

export async function updateFeedbackPriorityAction(
  feedbackId: string,
  priority: FeedbackPriority,
): Promise<ActionResult<{ feedback: SerializedFeedback }>> {
  const userId = await requireUserId();

  try {
    const feedback = await updateFeedbackPriority(userId, feedbackId, priority);
    await touchUserSeenSafely(userId);
    revalidatePath("/admin/feedback");
    return { success: true, feedback };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof FeedbackError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update priority.",
    };
  }
}

export async function deleteFeedbackAction(
  feedbackId: string,
): Promise<ActionResult> {
  const userId = await requireUserId();

  try {
    await deleteFeedback(userId, feedbackId);
    await touchUserSeenSafely(userId);
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof FeedbackError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to delete feedback.",
    };
  }
}
