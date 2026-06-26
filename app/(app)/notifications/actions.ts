"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  markAllNotificationsRead,
  markNotificationRead,
  NotificationAccessError,
} from "@/lib/notifications";
import { touchUserSeenSafely } from "@/lib/user-activity";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidateNotificationSurfaces() {
  revalidatePath("/today", "layout");
  revalidatePath("/plans", "layout");
  revalidatePath("/insights", "layout");
  revalidatePath("/settings", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/poke", "layout");
}

export type NotificationActionResult =
  | { success: true }
  | { success: false; error: string };

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const userId = await requireUserId();

  try {
    await markNotificationRead(notificationId, userId);
    await touchUserSeenSafely(userId);
    revalidateNotificationSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof NotificationAccessError
          ? error.message
          : "Failed to mark notification as read.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const userId = await requireUserId();

  try {
    await markAllNotificationsRead(userId);
    await touchUserSeenSafely(userId);
    revalidateNotificationSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark notifications as read.",
    };
  }
}
