import type { ReminderType } from "@/app/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { canUseReflectionFeatures } from "@/lib/roles";
import { sendPushToUser } from "@/lib/web-push";
import { prisma } from "@/lib/prisma";

const REMINDER_URL = "/today";
const REMINDER_TITLE = "Planlet";

const MORNING_BODY = "Take a moment to fill today’s plan.";
const EVENING_BODY_WITH_GRATITUDE =
  "Review today, update your tasks, and add gratitude.";
const EVENING_BODY_DEFAULT = "Review today and update your tasks.";

export type ReminderDispatchResult = {
  checked: number;
  sent: number;
  skipped: number;
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
  await sendPushToUser(userId, {
    title: REMINDER_TITLE,
    body: "This is a test notification from Planlet.",
    url: REMINDER_URL,
  });
}

export async function dispatchDueReminders(
  now = new Date(),
): Promise<ReminderDispatchResult> {
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

  for (const preference of preferences) {
    const localTime = formatInTimeZone(now, preference.timezone, "HH:mm");
    const localDate = formatInTimeZone(now, preference.timezone, "yyyy-MM-dd");

    const dueTypes: ReminderType[] = [];

    if (preference.morningEnabled && preference.morningTime === localTime) {
      dueTypes.push("MORNING_PLAN");
    }

    if (preference.eveningEnabled && preference.eveningTime === localTime) {
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
    }
  }

  return {
    checked: preferences.length,
    sent,
    skipped,
  };
}
