import type { NotificationPreference } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EVENING_REMINDER_TIME,
  DEFAULT_MORNING_REMINDER_TIME,
  isValidReminderTime,
  normalizeReminderTimeForInput,
} from "@/lib/reminder-time";
import { getUserTimezone } from "@/lib/user-timezone";

export {
  DEFAULT_EVENING_REMINDER_TIME,
  DEFAULT_MORNING_REMINDER_TIME,
  isValidReminderTime,
  normalizeReminderTimeForInput,
} from "@/lib/reminder-time";

export type NotificationPreferencesInput = {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  timezone?: string;
};

export type SerializedNotificationPreferences = {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  timezone: string;
};

export function serializeNotificationPreferences(
  preference: NotificationPreference,
): SerializedNotificationPreferences {
  return {
    morningEnabled: preference.morningEnabled,
    morningTime: normalizeReminderTimeForInput(
      preference.morningTime,
      DEFAULT_MORNING_REMINDER_TIME,
    ),
    eveningEnabled: preference.eveningEnabled,
    eveningTime: normalizeReminderTimeForInput(
      preference.eveningTime,
      DEFAULT_EVENING_REMINDER_TIME,
    ),
    timezone: preference.timezone,
  };
}

export async function getNotificationPreferencesForUser(
  userId: string,
): Promise<SerializedNotificationPreferences> {
  const timezone = await getUserTimezone(userId);

  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      timezone,
    },
    update: {},
  });

  return serializeNotificationPreferences(preference);
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferencesInput,
): Promise<SerializedNotificationPreferences> {
  if (!isValidReminderTime(input.morningTime)) {
    throw new Error("Choose a valid morning reminder time.");
  }

  if (!isValidReminderTime(input.eveningTime)) {
    throw new Error("Choose a valid evening reminder time.");
  }

  const timezone = input.timezone?.trim() || (await getUserTimezone(userId));

  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      morningEnabled: input.morningEnabled,
      morningTime: input.morningTime,
      eveningEnabled: input.eveningEnabled,
      eveningTime: input.eveningTime,
      timezone,
    },
    update: {
      morningEnabled: input.morningEnabled,
      morningTime: input.morningTime,
      eveningEnabled: input.eveningEnabled,
      eveningTime: input.eveningTime,
      timezone,
    },
  });

  return serializeNotificationPreferences(preference);
}
