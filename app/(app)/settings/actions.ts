"use server";

import type { PlanItemView, TaskOrganizationDisplay } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  updateNotificationPreferences,
  type NotificationPreferencesInput,
} from "@/lib/notification-preferences";
import { sendTestReminderPush } from "@/lib/reminders";
import { isWebPushConfigured } from "@/lib/env";
import {
  updatePlanItemView,
  updateTaskOrganizationDisplay,
} from "@/lib/user-preferences";
import { TASK_ORGANIZATION_DISPLAY_MODES } from "@/lib/task-organization-display";
import {
  normalizeTimezone,
  syncAutomaticBrowserTimezone,
  updateUserTimezone,
  updateUserTimezoneMode,
  type TimezoneModeValue,
} from "@/lib/user-timezone";

const PLAN_ITEM_VIEWS = new Set<PlanItemView>(["MINIMAL", "CHECKLIST"]);

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidatePlanSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/plans", "layout");
  revalidatePath("/dashboard");
}

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

export type SyncBrowserTimezoneResult =
  | { success: true; updated: boolean }
  | { success: false; error: string };

export async function syncBrowserTimezoneAction(
  browserTimezone: string,
): Promise<SyncBrowserTimezoneResult> {
  try {
    const userId = await requireUserId();
    const updated = await syncAutomaticBrowserTimezone(userId, browserTimezone);

    if (updated) {
      revalidatePlanSurfaces();
    }

    return { success: true, updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to sync browser timezone.",
    };
  }
}

export async function updateUserTimezoneModeAction(
  mode: TimezoneModeValue,
  browserTimezone?: string,
): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    await updateUserTimezoneMode(userId, mode, browserTimezone);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update timezone mode.",
    };
  }
}

export async function updateUserTimezoneAction(
  timezone: string,
): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    normalizeTimezone(timezone);
    await updateUserTimezone(userId, timezone);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update timezone.",
    };
  }
}

export async function updateNotificationPreferencesAction(
  input: NotificationPreferencesInput,
): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    await updateNotificationPreferences(userId, input);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update notification preferences.",
    };
  }
}

export async function sendTestNotificationAction(): Promise<SettingsActionResult> {
  if (!isWebPushConfigured()) {
    return {
      success: false,
      error: "Push notifications are not configured on the server.",
    };
  }

  try {
    const userId = await requireUserId();
    await sendTestReminderPush(userId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send test notification.",
    };
  }
}

export async function updatePlanItemViewAction(
  value: PlanItemView,
): Promise<SettingsActionResult> {
  if (!PLAN_ITEM_VIEWS.has(value)) {
    return { success: false, error: "Invalid plan item view." };
  }

  try {
    const userId = await requireUserId();
    await updatePlanItemView(userId, value);
    revalidatePlanSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update plan item view.",
    };
  }
}

export async function updateTaskOrganizationDisplayAction(
  value: TaskOrganizationDisplay,
): Promise<SettingsActionResult> {
  if (
    !TASK_ORGANIZATION_DISPLAY_MODES.includes(
      value as (typeof TASK_ORGANIZATION_DISPLAY_MODES)[number],
    )
  ) {
    return { success: false, error: "Invalid task organization display." };
  }

  try {
    const userId = await requireUserId();
    await updateTaskOrganizationDisplay(userId, value);
    revalidatePlanSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update task organization display.",
    };
  }
}
