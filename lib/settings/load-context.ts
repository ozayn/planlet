import { auth } from "@/auth";
import { APP_TIMEZONE } from "@/config/time";
import { PRODUCT } from "@/config/product";
import { isAdminRole } from "@/lib/auth-roles";
import { getActivityTimerPresetSettingsData } from "@/lib/activity-timer";
import { getLifeLabReadAloudPreferencesForUser } from "@/lib/life-lab/read-aloud-preferences";
import { resolveMobileNavItems } from "@/lib/mobile-nav";
import { getNotificationPreferencesForUser } from "@/lib/notification-preferences";
import {
  isImageExtractionConfigured,
  isOpenAIConfigured,
  isLifeLabOpenAiTtsEnabled,
  isTextParserConfigured,
} from "@/lib/env";
import {
  canUseActivityTimerFeatures,
  canUseBodyJourneyFeatures,
  canUseCareerJourneyFeatures,
  canUseCoachingFeatures,
  canUseJobTrackerFeatures,
  canUseLearningJourneyFeatures,
  canUseLifeLabFeatures,
  canUseIdeasFeatures,
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";
import type { SettingsAccessContext } from "@/lib/settings/types";
import {
  getMobileNavItemsForUser,
  getPlanningPreferencesForUser,
  getReadingDensityForUser,
} from "@/lib/user-preferences";
import { getUserTimezone } from "@/lib/user-timezone";

export async function loadSettingsAccessContext(): Promise<SettingsAccessContext> {
  const session = await auth();
  const user = session?.user;
  const userId = user?.id ?? null;
  const isAdmin = isAdminRole(user?.role);

  const canUseLifeLab = canUseLifeLabFeatures(user ?? {});
  const canUseTimer = canUseActivityTimerFeatures(user ?? {});
  const showReflectionCoaching =
    canUseCoachingFeatures(user ?? {}) ||
    canUseReflectionFeatures(user ?? {}) ||
    canUseTherapyThoughts(user ?? {});

  const hasReadAloudSettings = Boolean(userId && canUseLifeLab);
  const hasTimerPresets = Boolean(userId && (canUseTimer || isAdmin));

  return {
    isSignedIn: Boolean(userId),
    isAdmin,
    canUseLifeLabFeatures: canUseLifeLab,
    canUseActivityTimerFeatures: canUseTimer,
    showReflectionCoaching,
    hasReadAloudSettings,
    hasTimerPresets,
    hasNotifications: Boolean(userId),
  };
}

export async function loadSettingsPageData() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const user = session?.user;
  const access = await loadSettingsAccessContext();
  const isAdmin = access.isAdmin;

  const appNavAccess = {
    isAdmin,
    canUseCoachingFeatures: canUseCoachingFeatures(user ?? {}),
    canUseBodyJourneyFeatures: canUseBodyJourneyFeatures(user ?? {}),
    canUseLearningJourneyFeatures: canUseLearningJourneyFeatures(user ?? {}),
    canUseLifeLabFeatures: canUseLifeLabFeatures(user ?? {}),
    canUseIdeasFeatures: canUseIdeasFeatures(user ?? {}),
    canUseActivityTimerFeatures: canUseActivityTimerFeatures(user ?? {}),
    canUseJobTrackerFeatures: canUseJobTrackerFeatures(user ?? {}),
    canUseCareerJourneyFeatures: canUseCareerJourneyFeatures(user ?? {}),
  };

  const [
    planningPreferences,
    userTimezone,
    notificationPreferences,
    mobileNavItems,
    readingDensity,
    readAloudPreferences,
    activityTimerPresetSettings,
  ] = userId
    ? await Promise.all([
        getPlanningPreferencesForUser(userId),
        getUserTimezone(userId),
        getNotificationPreferencesForUser(userId),
        getMobileNavItemsForUser(userId),
        getReadingDensityForUser(userId),
        access.hasReadAloudSettings
          ? getLifeLabReadAloudPreferencesForUser(userId)
          : Promise.resolve(null),
        access.hasTimerPresets
          ? getActivityTimerPresetSettingsData(userId)
          : Promise.resolve(null),
      ])
    : [
        {
          planItemView: "CHECKLIST" as const,
          taskOrganizationDisplay: "ASSIGNED_ONLY" as const,
        },
        APP_TIMEZONE,
        null,
        [],
        "compact" as const,
        null,
        null,
      ];

  const timezoneMode = session?.user?.timezoneMode ?? "AUTOMATIC";
  const resolvedMobileNavItems = userId
    ? resolveMobileNavItems(mobileNavItems, appNavAccess)
    : resolveMobileNavItems([], appNavAccess);

  return {
    session,
    access,
    appNavAccess,
    planningPreferences,
    userTimezone,
    timezoneMode,
    notificationPreferences,
    mobileNavItems: resolvedMobileNavItems,
    readingDensity,
    readAloudPreferences,
    activityTimerPresetSettings,
    openAiNarrationAvailable: isLifeLabOpenAiTtsEnabled(),
    technicalInfoRows: [
      { label: "Name", value: PRODUCT.name },
      { label: "Version", value: "0.1.0" },
      { label: "Your timezone", value: userTimezone },
      { label: "Fallback timezone", value: APP_TIMEZONE },
      {
        label: "AI parsing",
        value: isTextParserConfigured() ? "Available" : "Not configured",
      },
      {
        label: "Audio transcription",
        value: isOpenAIConfigured() ? "Available" : "Not configured",
      },
      {
        label: "Image text extraction",
        value: isImageExtractionConfigured() ? "Available" : "Not configured",
      },
    ],
    reflectionCoaching: {
      canUseCoachingFeatures: canUseCoachingFeatures(user ?? {}),
      canUseReflectionFeatures: canUseReflectionFeatures(user ?? {}),
      canUseTherapyThoughts: canUseTherapyThoughts(user ?? {}),
    },
  };
}

export type SettingsPageData = Awaited<ReturnType<typeof loadSettingsPageData>>;
