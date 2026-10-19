import { auth } from "@/auth";
import { APP_TIMEZONE } from "@/config/time";
import { PRODUCT } from "@/config/product";
import { isAdminRole } from "@/lib/auth-roles";
import { getActivityTimerPresetSettingsData } from "@/lib/activity-timer";
import { getPomodoroPreferences } from "@/lib/pomodoro";
import { listPomodoroActivities } from "@/lib/pomodoro/activities";
import { getCoachingNarrationPreferencesForUser } from "@/lib/coaching/narration-preferences";
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
  canUsePomodoroFeatures,
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
  const canUseCoaching = canUseCoachingFeatures(user ?? {});
  const canUseTimer = canUseActivityTimerFeatures(user ?? {});
  const canUsePomodoro = canUsePomodoroFeatures(user ?? {});
  const showReflectionCoaching =
    canUseCoaching ||
    canUseReflectionFeatures(user ?? {}) ||
    canUseTherapyThoughts(user ?? {});

  const hasReadAloudSettings = Boolean(
    userId && (canUseLifeLab || canUseCoaching),
  );
  const hasTimerPresets = Boolean(userId && (canUseTimer || isAdmin));
  const hasPomodoroSettings = Boolean(userId && (canUsePomodoro || isAdmin));

  return {
    isSignedIn: Boolean(userId),
    isAdmin,
    canUseLifeLabFeatures: canUseLifeLab,
    canUseCoachingFeatures: canUseCoaching,
    canUseActivityTimerFeatures: canUseTimer,
    canUsePomodoroFeatures: canUsePomodoro,
    showReflectionCoaching,
    hasReadAloudSettings,
    hasTimerPresets,
    hasPomodoroSettings,
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
    canUsePomodoroFeatures: canUsePomodoroFeatures(user ?? {}),
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
    coachingNarrationPreferences,
    activityTimerPresetSettings,
    pomodoroPreferences,
    pomodoroActivities,
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
        access.canUseCoachingFeatures
          ? getCoachingNarrationPreferencesForUser(userId)
          : Promise.resolve(null),
        access.hasTimerPresets
          ? getActivityTimerPresetSettingsData(userId)
          : Promise.resolve(null),
        access.hasPomodoroSettings
          ? getPomodoroPreferences(userId)
          : Promise.resolve(null),
        access.hasPomodoroSettings
          ? listPomodoroActivities(userId)
          : Promise.resolve([]),
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
        null,
        null,
        [],
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
    coachingNarrationPreferences,
    activityTimerPresetSettings,
    pomodoroPreferences,
    pomodoroActivities,
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
