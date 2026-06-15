import webpush from "web-push";

import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export const PUSH_SEND_TIMEOUT_MS = 10_000;

let vapidConfigured = false;

export function getPublicVapidKey(): string | undefined {
  return getWebPushPublicKey();
}

function ensureVapidConfigured(): boolean {
  if (!isWebPushConfigured()) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.WEB_PUSH_SUBJECT!.trim(),
      process.env.WEB_PUSH_PUBLIC_KEY!.trim(),
      process.env.WEB_PUSH_PRIVATE_KEY!.trim(),
    );
    vapidConfigured = true;
  }

  return true;
}

function getPushErrorStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return undefined;
}

function getPushErrorBody(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "body" in error &&
    typeof error.body === "string"
  ) {
    return error.body;
  }

  return undefined;
}

function withPushTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Push send timed out after ${PUSH_SEND_TIMEOUT_MS}ms`),
        );
      }, PUSH_SEND_TIMEOUT_MS);
    }),
  ]);
}

export async function sendPushSubscription(
  subscription: Pick<StoredPushSubscription, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
): Promise<"sent" | "stale" | "failed" | "timed_out"> {
  if (!ensureVapidConfigured()) {
    return "failed";
  }

  try {
    await withPushTimeout(
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
      ),
    );
    return "sent";
  } catch (error) {
    const statusCode = getPushErrorStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      return "stale";
    }

    const timedOut =
      error instanceof Error &&
      error.message.includes("Push send timed out after");

    if (!timedOut) {
      console.warn("[web-push] Failed to send notification:", {
        endpoint: subscription.endpoint,
        statusCode,
        body: getPushErrorBody(error),
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return timedOut ? "timed_out" : "failed";
  }
}

export type PushSendResult = {
  subscriptionCount: number;
  sent: number;
  failed: number;
  timedOut: number;
  staleRemoved: number;
};

const TEST_PUSH_PAYLOAD: PushPayload = {
  title: "Planlet",
  body: "Notifications are working.",
  url: "/today",
};

export async function sendPushToSubscriptionsWithResult(
  subscriptions: StoredPushSubscription[],
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!ensureVapidConfigured()) {
    return {
      subscriptionCount: subscriptions.length,
      sent: 0,
      failed: 0,
      timedOut: 0,
      staleRemoved: 0,
    };
  }

  const outcomes = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const result = await sendPushSubscription(subscription, payload);
      return { subscription, result };
    }),
  );

  let sent = 0;
  let failed = 0;
  let timedOut = 0;
  const staleIds: string[] = [];

  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      failed += 1;
      console.warn("[web-push] Unexpected push send rejection:", {
        message:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "Unknown error",
      });
      continue;
    }

    const { subscription, result } = outcome.value;

    if (result === "sent") {
      sent += 1;
      continue;
    }

    if (result === "stale") {
      staleIds.push(subscription.id);
      continue;
    }

    if (result === "timed_out") {
      timedOut += 1;
      failed += 1;
      continue;
    }

    failed += 1;
  }

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  return {
    subscriptionCount: subscriptions.length,
    sent,
    failed,
    timedOut,
    staleRemoved: staleIds.length,
  };
}

export async function sendPushToUserWithResult(
  userId: string,
  payload: PushPayload,
): Promise<PushSendResult> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  return sendPushToSubscriptionsWithResult(subscriptions, payload);
}

export async function sendTestPushNotification(
  userId: string,
): Promise<PushSendResult> {
  return sendPushToUserWithResult(userId, TEST_PUSH_PAYLOAD);
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  await sendPushToUserWithResult(userId, payload);
}
