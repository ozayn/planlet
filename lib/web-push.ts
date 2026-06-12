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

export async function sendPushSubscription(
  subscription: Pick<StoredPushSubscription, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
): Promise<"sent" | "stale" | "failed"> {
  if (!ensureVapidConfigured()) {
    return "failed";
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
    return "sent";
  } catch (error) {
    const statusCode = getPushErrorStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      return "stale";
    }

    console.warn("[web-push] Failed to send notification:", {
      endpoint: subscription.endpoint,
      statusCode,
      body: getPushErrorBody(error),
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return "failed";
  }
}

export type PushSendResult = {
  subscriptionCount: number;
  sent: number;
  failed: number;
  staleRemoved: number;
};

const TEST_PUSH_PAYLOAD: PushPayload = {
  title: "Planlet",
  body: "Notifications are working.",
  url: "/today",
};

export async function sendPushToUserWithResult(
  userId: string,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!ensureVapidConfigured()) {
    return {
      subscriptionCount: 0,
      sent: 0,
      failed: 0,
      staleRemoved: 0,
    };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  let sent = 0;
  let failed = 0;
  let staleRemoved = 0;

  for (const subscription of subscriptions) {
    const result = await sendPushSubscription(subscription, payload);

    if (result === "sent") {
      sent += 1;
      continue;
    }

    if (result === "stale") {
      staleRemoved += 1;
      await prisma.pushSubscription.delete({
        where: { id: subscription.id },
      });
      continue;
    }

    failed += 1;
  }

  return {
    subscriptionCount: subscriptions.length,
    sent,
    failed,
    staleRemoved,
  };
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

