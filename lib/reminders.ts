import type { ReminderType } from "@/app/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { canUseReflectionFeatures } from "@/lib/roles";
import {
  sendPushToSubscriptionsWithResult,
  sendTestPushNotification,
} from "@/lib/web-push";
import { prisma } from "@/lib/prisma";

const REMINDER_URL = "/today";
const REMINDER_TITLE = "Planlet";
export const REMINDER_WINDOW_MINUTES = 10;

function parseTimeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesAsHhmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getReminderWindowEnd(reminderHhmm: string): string {
  return formatMinutesAsHhmm(
    parseTimeToMinutes(reminderHhmm) + REMINDER_WINDOW_MINUTES,
  );
}

export function isWithinReminderWindow(
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

export type ReminderCronTiming = {
  totalMs: number;
  loadPreferencesMs: number;
  timezoneMatchingMs: number;
  duplicateChecksMs: number;
  pushSubscriptionLookupMs: number;
  pushDeliveryMs: number;
  databaseWritesMs: number;
};

export type ReminderCronResult = {
  totalPreferenceRows: number;
  eligibleUsers: number;
  checkedUsers: number;
  dueReminders: number;
  sent: number;
  skipped: number;
  skippedOutsideWindow: number;
  skippedDuplicate: number;
  skippedNoPushDelivery: number;
  errors: number;
  subscriptionsFound: number;
  subscriptionsSent: number;
  subscriptionsFailed: number;
  subscriptionsTimedOut: number;
  staleRemoved: number;
  timing: ReminderCronTiming;
};

export type RunReminderCronOptions = {
  now?: Date;
  debug?: boolean;
};

type PreferenceRow = {
  userId: string;
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  timezone: string;
  user: {
    email: string | null;
    canUseReflectionFeatures: boolean;
    role: string;
  };
};

type DueReminder = {
  userId: string;
  email: string | null;
  type: ReminderType;
  localDate: string;
  user: PreferenceRow["user"];
  pushSubscriptionCount: number;
  debug: Record<string, unknown>;
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

function logReminderDebug(
  message: string,
  details: Record<string, unknown>,
): void {
  console.log(`[reminders:debug] ${message}`, details);
}

function dueReminderKey(due: Pick<DueReminder, "userId" | "type" | "localDate">) {
  return `${due.userId}:${due.type}:${due.localDate}`;
}

function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
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
  options: RunReminderCronOptions = {},
): Promise<ReminderCronResult> {
  const totalStart = performance.now();
  const now = options.now ?? new Date();
  const debug = options.debug === true;

  console.time("total");

  console.time("load_preferences");
  const loadStart = performance.now();
  const [totalPreferenceRows, preferences, subscriptionCounts] =
    await Promise.all([
      prisma.notificationPreference.count(),
      prisma.notificationPreference.findMany({
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
              email: true,
              canUseReflectionFeatures: true,
              role: true,
            },
          },
        },
      }),
      prisma.pushSubscription.groupBy({
        by: ["userId"],
        _count: { _all: true },
      }),
    ]);
  const loadPreferencesMs = elapsedMs(loadStart);
  console.timeEnd("load_preferences");

  const pushCountByUserId = new Map(
    subscriptionCounts.map((entry) => [entry.userId, entry._count._all]),
  );

  if (debug) {
    logReminderDebug("cron-start", {
      nowUtc: now.toISOString(),
      totalPreferenceRows,
      eligibleUsers: preferences.length,
      reminderWindowMinutes: REMINDER_WINDOW_MINUTES,
    });
  }

  console.time("timezone_matching");
  const timezoneStart = performance.now();
  const dueReminders: DueReminder[] = [];
  let skippedOutsideWindow = 0;

  for (const preference of preferences) {
    const localDateTime = formatInTimeZone(
      now,
      preference.timezone,
      "yyyy-MM-dd HH:mm:ss XXX",
    );
    const localTime = formatInTimeZone(now, preference.timezone, "HH:mm");
    const localDate = formatInTimeZone(now, preference.timezone, "yyyy-MM-dd");
    const morningMatched =
      preference.morningEnabled &&
      isWithinReminderWindow(localTime, preference.morningTime);
    const eveningMatched =
      preference.eveningEnabled &&
      isWithinReminderWindow(localTime, preference.eveningTime);
    const pushSubscriptionCount = pushCountByUserId.get(preference.userId) ?? 0;

    const userDebug = {
      userId: preference.userId,
      email: preference.user.email,
      timezone: preference.timezone,
      morningEnabled: preference.morningEnabled,
      morningTime: preference.morningTime,
      eveningEnabled: preference.eveningEnabled,
      eveningTime: preference.eveningTime,
      localDateTime,
      localHhmm: localTime,
      morningWindow: preference.morningEnabled
        ? {
            start: preference.morningTime,
            end: getReminderWindowEnd(preference.morningTime),
          }
        : null,
      eveningWindow: preference.eveningEnabled
        ? {
            start: preference.eveningTime,
            end: getReminderWindowEnd(preference.eveningTime),
          }
        : null,
      morningMatched,
      eveningMatched,
      pushSubscriptionCount,
    };

    if (morningMatched) {
      dueReminders.push({
        userId: preference.userId,
        email: preference.user.email,
        type: "MORNING_PLAN",
        localDate,
        user: preference.user,
        pushSubscriptionCount,
        debug: userDebug,
      });
    }

    if (eveningMatched) {
      dueReminders.push({
        userId: preference.userId,
        email: preference.user.email,
        type: "EVENING_REFLECTION",
        localDate,
        user: preference.user,
        pushSubscriptionCount,
        debug: userDebug,
      });
    }

    if (!morningMatched && !eveningMatched) {
      skippedOutsideWindow += 1;
      if (debug) {
        logReminderDebug("user-skipped-outside-window", {
          ...userDebug,
          skipReason: "outside_reminder_window",
        });
      }
    } else if (debug) {
      logReminderDebug("user-in-window", {
        ...userDebug,
        dueTypes: [
          ...(morningMatched ? ["MORNING_PLAN"] : []),
          ...(eveningMatched ? ["EVENING_REFLECTION"] : []),
        ],
      });
    }
  }
  const timezoneMatchingMs = elapsedMs(timezoneStart);
  console.timeEnd("timezone_matching");

  console.time("duplicate_checks");
  const duplicateStart = performance.now();
  const existingSent =
    dueReminders.length > 0
      ? await prisma.sentReminder.findMany({
          where: {
            OR: dueReminders.map((due) => ({
              userId: due.userId,
              type: due.type,
              localDate: due.localDate,
            })),
          },
          select: {
            userId: true,
            type: true,
            localDate: true,
          },
        })
      : [];
  const sentKeys = new Set(existingSent.map((entry) => dueReminderKey(entry)));
  const pendingDueReminders = dueReminders.filter(
    (due) => !sentKeys.has(dueReminderKey(due)),
  );
  let skippedDuplicate = dueReminders.length - pendingDueReminders.length;

  if (debug) {
    for (const due of dueReminders) {
      if (sentKeys.has(dueReminderKey(due))) {
        logReminderDebug("reminder-skipped-duplicate", {
          ...due.debug,
          type: due.type,
          localDate: due.localDate,
          skipReason: "already_sent_today",
        });
      }
    }
  }
  const duplicateChecksMs = elapsedMs(duplicateStart);
  console.timeEnd("duplicate_checks");

  console.time("push_subscription_lookup");
  const subscriptionLookupStart = performance.now();
  const dueUserIds = [...new Set(pendingDueReminders.map((due) => due.userId))];
  const subscriptions =
    dueUserIds.length > 0
      ? await prisma.pushSubscription.findMany({
          where: { userId: { in: dueUserIds } },
          select: {
            id: true,
            userId: true,
            endpoint: true,
            p256dh: true,
            auth: true,
          },
        })
      : [];
  const subscriptionsByUserId = new Map<
    string,
    Array<(typeof subscriptions)[number]>
  >();
  for (const subscription of subscriptions) {
    const existing = subscriptionsByUserId.get(subscription.userId) ?? [];
    existing.push(subscription);
    subscriptionsByUserId.set(subscription.userId, existing);
  }
  const pushSubscriptionLookupMs = elapsedMs(subscriptionLookupStart);
  console.timeEnd("push_subscription_lookup");

  console.time("push_delivery");
  const pushDeliveryStart = performance.now();
  let subscriptionsFound = 0;
  let subscriptionsSent = 0;
  let subscriptionsFailed = 0;
  let subscriptionsTimedOut = 0;
  let staleRemoved = 0;
  let skippedNoPushDelivery = 0;
  let errors = 0;
  let sent = 0;

  const deliveryOutcomes = await Promise.allSettled(
    pendingDueReminders.map(async (due) => {
      const userSubscriptions = subscriptionsByUserId.get(due.userId) ?? [];
      const pushResult = await sendPushToSubscriptionsWithResult(
        userSubscriptions,
        getReminderPayload(due.type, due.user),
      );
      return { due, pushResult };
    }),
  );

  const sentReminderRows: Array<{
    userId: string;
    type: ReminderType;
    localDate: string;
  }> = [];

  for (const outcome of deliveryOutcomes) {
    if (outcome.status === "rejected") {
      errors += 1;
      console.warn("[reminders] Unexpected delivery rejection:", {
        message:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "Unknown error",
      });
      continue;
    }

    const { due, pushResult } = outcome.value;
    subscriptionsFound += pushResult.subscriptionCount;
    subscriptionsSent += pushResult.sent;
    subscriptionsFailed += pushResult.failed;
    subscriptionsTimedOut += pushResult.timedOut;
    staleRemoved += pushResult.staleRemoved;

    if (pushResult.sent === 0) {
      skippedNoPushDelivery += 1;
      if (debug) {
        logReminderDebug("reminder-skipped-no-delivery", {
          ...due.debug,
          type: due.type,
          localDate: due.localDate,
          skipReason:
            pushResult.subscriptionCount === 0
              ? "no_push_subscription"
              : "push_send_failed",
          pushResult,
        });
      } else {
        console.warn("[reminders] Reminder not delivered:", {
          userId: due.userId,
          email: due.email,
          type: due.type,
          localDate: due.localDate,
          subscriptionCount: pushResult.subscriptionCount,
          failed: pushResult.failed,
          timedOut: pushResult.timedOut,
          staleRemoved: pushResult.staleRemoved,
        });
      }
      continue;
    }

    sentReminderRows.push({
      userId: due.userId,
      type: due.type,
      localDate: due.localDate,
    });
    sent += 1;

    if (debug) {
      logReminderDebug("reminder-sent", {
        ...due.debug,
        type: due.type,
        localDate: due.localDate,
        pushResult,
      });
    }
  }
  const pushDeliveryMs = elapsedMs(pushDeliveryStart);
  console.timeEnd("push_delivery");

  console.time("database_writes");
  const databaseWritesStart = performance.now();
  if (sentReminderRows.length > 0) {
    await prisma.sentReminder.createMany({
      data: sentReminderRows,
      skipDuplicates: true,
    });
  }
  const databaseWritesMs = elapsedMs(databaseWritesStart);
  console.timeEnd("database_writes");

  const timing: ReminderCronTiming = {
    totalMs: elapsedMs(totalStart),
    loadPreferencesMs,
    timezoneMatchingMs,
    duplicateChecksMs,
    pushSubscriptionLookupMs,
    pushDeliveryMs,
    databaseWritesMs,
  };

  const result: ReminderCronResult = {
    totalPreferenceRows,
    eligibleUsers: preferences.length,
    checkedUsers: preferences.length,
    dueReminders: dueReminders.length,
    sent,
    skipped:
      skippedOutsideWindow + skippedDuplicate + skippedNoPushDelivery + errors,
    skippedOutsideWindow,
    skippedDuplicate,
    skippedNoPushDelivery,
    errors,
    subscriptionsFound,
    subscriptionsSent,
    subscriptionsFailed,
    subscriptionsTimedOut,
    staleRemoved,
    timing,
  };

  console.timeEnd("total");

  console.log("[reminders] timing", timing);
  console.log("[reminders] push", {
    subscriptionsFound,
    subscriptionsSent,
    subscriptionsFailed,
    subscriptionsTimedOut,
    staleRemoved,
  });

  if (debug) {
    logReminderDebug("cron-summary", result);
  }

  return result;
}

/** @deprecated Use runReminderCron */
export const dispatchDueReminders = runReminderCron;
