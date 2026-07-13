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
  updateMobileNavItems,
  updateReadingDensity,
} from "@/lib/user-preferences";
import {
  isReadingDensityValue,
  type ReadingDensityValue,
} from "@/lib/reading-density";
import { TASK_ORGANIZATION_DISPLAY_MODES } from "@/lib/task-organization-display";
import { isAdminRole } from "@/lib/auth-roles";
import type { AppNavAccess } from "@/lib/app-nav";
import {
  DEFAULT_MOBILE_NAV_ITEMS,
  sanitizeMobileNavItems,
} from "@/lib/mobile-nav";
import {
  normalizeTimezone,
  syncAutomaticBrowserTimezone,
  updateUserTimezone,
  updateUserTimezoneMode,
  type TimezoneModeValue,
} from "@/lib/user-timezone";

import type { Session } from "next-auth";

const PLAN_ITEM_VIEWS = new Set<PlanItemView>(["MINIMAL", "CHECKLIST"]);

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidateSettingsSurfaces() {
  revalidatePath("/settings", "layout");
}

function revalidatePlanSurfaces() {
  revalidateSettingsSurfaces();
  revalidatePath("/today");
  revalidatePath("/plans", "layout");
  revalidatePath("/dashboard");
}

function revalidateAppNavigation() {
  revalidateSettingsSurfaces();
  revalidatePath("/today", "layout");
}

function getAppNavAccessFromSession(session: Session): AppNavAccess {
  return {
    isAdmin: isAdminRole(session.user.role),
    canUseCoachingFeatures: session.user.canUseCoachingFeatures,
    canUseBodyJourneyFeatures: session.user.canUseBodyJourneyFeatures,
    canUseLearningJourneyFeatures: session.user.canUseLearningJourneyFeatures,
    canUseLifeLabFeatures: session.user.canUseLifeLabFeatures,
    canUseIdeasFeatures: session.user.canUseIdeasFeatures,
    canUseActivityTimerFeatures: session.user.canUseActivityTimerFeatures,
    canUseJobTrackerFeatures: session.user.canUseJobTrackerFeatures,
    canUseCareerJourneyFeatures: session.user.canUseCareerJourneyFeatures,
  };
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
    revalidateSettingsSurfaces();
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
    revalidateSettingsSurfaces();
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
    revalidateSettingsSurfaces();
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

function revalidateReadingDensitySurfaces() {
  revalidateSettingsSurfaces();
  revalidatePath("/", "layout");
}

export async function updateReadingDensityAction(
  value: ReadingDensityValue,
): Promise<SettingsActionResult> {
  if (!isReadingDensityValue(value)) {
    return { success: false, error: "Invalid reading density." };
  }

  try {
    const userId = await requireUserId();
    await updateReadingDensity(userId, value);
    revalidateReadingDensitySurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update reading density.",
    };
  }
}

export async function updateMobileNavItemsAction(
  items: string[],
): Promise<SettingsActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const access = getAppNavAccessFromSession(session);
    const sanitized = sanitizeMobileNavItems(items, access);

    await updateMobileNavItems(session.user.id, sanitized);
    revalidateAppNavigation();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update quick access tabs.",
    };
  }
}

export async function resetMobileNavItemsAction(): Promise<SettingsActionResult> {
  return updateMobileNavItemsAction([...DEFAULT_MOBILE_NAV_ITEMS]);
}

export async function updateLifeLabReadAloudProviderAction(
  provider: "DEVICE" | "OPENAI",
): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const { updateLifeLabReadAloudProvider } = await import(
      "@/lib/life-lab/read-aloud-preferences"
    );
    await updateLifeLabReadAloudProvider(userId, provider);
    revalidateSettingsSurfaces();
    revalidatePath("/life-lab", "layout");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update read aloud provider.",
    };
  }
}

export async function updateLifeLabSpeechVoiceAction(
  speechVoiceId: string,
): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const { updateLifeLabSpeechVoiceId } = await import(
      "@/lib/life-lab/read-aloud-preferences"
    );
    await updateLifeLabSpeechVoiceId(userId, speechVoiceId);
    revalidateSettingsSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update speech voice.",
    };
  }
}

export async function updateLifeLabSpeechRateAction(
  speechRate: number,
): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const { updateLifeLabSpeechRate } = await import(
      "@/lib/life-lab/read-aloud-preferences"
    );
    await updateLifeLabSpeechRate(userId, speechRate as 0.8 | 1 | 1.15 | 1.3 | 1.5);
    revalidateSettingsSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update speech rate.",
    };
  }
}
