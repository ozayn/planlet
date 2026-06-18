import { auth } from "@/auth";
import type { TimezoneMode } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FALLBACK_TIMEZONE,
  normalizeTimezone,
  type TimezoneModeValue,
} from "@/lib/user-timezone-constants";

export {
  FALLBACK_TIMEZONE,
  SETTINGS_TIMEZONE_OPTIONS,
  TIMEZONE_MODE_OPTIONS,
  TIMEZONE_MODES,
  type SettingsTimezoneOption,
  type TimezoneModeValue,
  isValidTimezone,
  normalizeTimezone,
} from "@/lib/user-timezone-constants";

export type UserTimezoneSettings = {
  timezone: string | null;
  timezoneMode: TimezoneMode;
  effectiveTimezone: string;
};

export async function getUserTimezone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  return user?.timezone ?? FALLBACK_TIMEZONE;
}

export async function getUserTimezoneSettings(
  userId: string,
): Promise<UserTimezoneSettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, timezoneMode: true },
  });

  return {
    timezone: user?.timezone ?? null,
    timezoneMode: user?.timezoneMode ?? "AUTOMATIC",
    effectiveTimezone: user?.timezone ?? FALLBACK_TIMEZONE,
  };
}

export async function getUserTimezoneRecord(
  userId: string,
): Promise<{ timezone: string | null; effectiveTimezone: string }> {
  const settings = await getUserTimezoneSettings(userId);

  return {
    timezone: settings.timezone,
    effectiveTimezone: settings.effectiveTimezone,
  };
}

export async function getSessionUserTimezone(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    return FALLBACK_TIMEZONE;
  }

  return getUserTimezone(session.user.id);
}

export async function syncNotificationPreferenceTimezone(
  userId: string,
  timezone: string,
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      timezone,
    },
    update: {
      timezone,
    },
  });
}

export async function syncAutomaticBrowserTimezone(
  userId: string,
  browserTimezone: string,
): Promise<boolean> {
  const normalized = normalizeTimezone(browserTimezone);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, timezoneMode: true },
  });

  if (!user || user.timezoneMode !== "AUTOMATIC") {
    return false;
  }

  if (user.timezone === normalized) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { timezone: normalized },
  });
  await syncNotificationPreferenceTimezone(userId, normalized);

  return true;
}

export async function updateUserTimezone(
  userId: string,
  timezone: string,
): Promise<string> {
  const normalized = normalizeTimezone(timezone);

  await prisma.user.update({
    where: { id: userId },
    data: {
      timezone: normalized,
      timezoneMode: "MANUAL",
    },
  });
  await syncNotificationPreferenceTimezone(userId, normalized);

  return normalized;
}

export async function updateUserTimezoneMode(
  userId: string,
  mode: TimezoneModeValue,
  browserTimezone?: string,
): Promise<string> {
  if (mode === "AUTOMATIC") {
    if (!browserTimezone) {
      throw new Error("Browser timezone is required for automatic mode.");
    }

    const normalized = normalizeTimezone(browserTimezone);

    await prisma.user.update({
      where: { id: userId },
      data: {
        timezoneMode: "AUTOMATIC",
        timezone: normalized,
      },
    });
    await syncNotificationPreferenceTimezone(userId, normalized);

    return normalized;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { timezoneMode: "MANUAL" },
  });

  return getUserTimezone(userId);
}
