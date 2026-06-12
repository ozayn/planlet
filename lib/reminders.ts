import type { ReminderType } from "@/app/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { canUseReflectionFeatures } from "@/lib/roles";
import { sendPushToUser, sendTestPushNotification } from "@/lib/web-push";
import { prisma } from "@/lib/prisma";

const REMINDER_URL = "/today";
const REMINDER_TITLE = "Planlet";
const REMINDER_WINDOW_MINUTES = 10;

function parseTimeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinReminderWindow(
  currentHhmm: string,
  reminderHhmm: string,
  windowMinutes = REMINDER_WINDOW_MINUTES,
): boolean {
  const current = parseTimeToMinutes(currentHhmm);
  const reminder = parseTimeToMinutes(reminderHhmm);

  return current >= reminder && current < reminder + windowMinutes;
}

const MORNING_BODY = "Take a moment to fill today’s plan.";
const EVENING_BODY_WITH_GRATITUDE =
  "Review today, update your tasks, and add gratitude.";
const EVENING_BODY_DEFAULT = "Review today and update your tasks.";

export type ReminderCronResult = {
  checkedUsers: number;
  sent: number;
  skipped: number;
  errors: number;
};

function getEveningReminderBody(user: {
  canUseReflectionFeatures: boolean;
}): string {
  return canUseReflectionFeatures(user)
    ? EVENING_BODY_WITH_GRATITUDE
    : EVENING_BODY_DEFAULT;
}

function getReminderPayload(
  type: ReminderType,
  user: { canUseReflectionFeatures: boolean },
) {
  if (type === "MORNING_PLAN") {
    return {
      title: REMINDER_TITLE,
      body: MORNING_BODY,
      url: REMINDER_URL,
    };
  }

  return {
    title: REMINDER_TITLE,
    body: getEveningReminderBody(user),
    url: REMINDER_URL,
  };
}

export async function sendTestReminderPush(userId: string): Promise<void> {
  const result = await sendTestPushNotification(userId);

  if (result.subscriptionCount === 0) {
    throw new Error(
      "No push subscription found. Enable phone notifications again.",
    );
  }

  if (result.sent === 0) {
    throw new Error(
      result.staleRemoved > 0
        ? "This notification subscription expired. Enable phone notifications again."
        : "Couldn't send test notification.",
    );
  }
}

export async function runReminderCron(
  now = new Date(),
): Promise<ReminderCronResult> {
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      OR: [{ morningEnabled: true }, { eveningEnabled: true }],
    },
    select: {
      userId: true,
      morningEnabled: true,
      morningTime: true,
      eveningEnabled: true,
      eveningTime: true,
      timezone: true,
      user: {
        select: {
          canUseReflectionFeatures: true,
          role: true,
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const preference of preferences) {
    const localTime = formatInTimeZone(now, preference.timezone, "HH:mm");
    const localDate = formatInTimeZone(now, preference.timezone, "yyyy-MM-dd");

    const dueTypes: ReminderType[] = [];

    if (
      preference.morningEnabled &&
      isWithinReminderWindow(localTime, preference.morningTime)
    ) {
      dueTypes.push("MORNING_PLAN");
    }

    if (
      preference.eveningEnabled &&
      isWithinReminderWindow(localTime, preference.eveningTime)
    ) {
      dueTypes.push("EVENING_REFLECTION");
    }

    if (dueTypes.length === 0) {
      skipped += 1;
      continue;
    }

    for (const type of dueTypes) {
      const alreadySent = await prisma.sentReminder.findUnique({
        where: {
          userId_type_localDate: {
            userId: preference.userId,
            type,
            localDate,
          },
        },
        select: { id: true },
      });

      if (alreadySent) {
        skipped += 1;
        continue;
      }

      try {
        await sendPushToUser(
          preference.userId,
          getReminderPayload(type, preference.user),
        );

        await prisma.sentReminder.create({
          data: {
            userId: preference.userId,
            type,
            localDate,
          },
        });

        sent += 1;
      } catch (error) {
        errors += 1;
        console.warn("[reminders] Failed to send reminder:", {
          userId: preference.userId,
          type,
          localDate,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return {
    checkedUsers: preferences.length,
    sent,
    skipped,
    errors,
  };
}

/** @deprecated Use runReminderCron */
export const dispatchDueReminders = runReminderCron;
