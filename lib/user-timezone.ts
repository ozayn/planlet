import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  FALLBACK_TIMEZONE,
  normalizeTimezone,
} from "@/lib/user-timezone-constants";

export {
  FALLBACK_TIMEZONE,
  SETTINGS_TIMEZONE_OPTIONS,
  type SettingsTimezoneOption,
  isValidTimezone,
  normalizeTimezone,
} from "@/lib/user-timezone-constants";

export async function getUserTimezone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  return user?.timezone ?? FALLBACK_TIMEZONE;
}

export async function getUserTimezoneRecord(
  userId: string,
): Promise<{ timezone: string | null; effectiveTimezone: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  return {
    timezone: user?.timezone ?? null,
    effectiveTimezone: user?.timezone ?? FALLBACK_TIMEZONE,
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

export async function setUserTimezoneIfUnset(
  userId: string,
  timezone: string,
): Promise<boolean> {
  const normalized = normalizeTimezone(timezone);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user || user.timezone !== null) {
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
    data: { timezone: normalized },
  });
  await syncNotificationPreferenceTimezone(userId, normalized);

  return normalized;
}
