import webpush from "web-push";

import { isWebPushConfigured } from "@/lib/env";
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

export async function sendPushNotification(
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

    console.warn("[push] Failed to send notification:", {
      endpoint: subscription.endpoint,
      statusCode,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return "failed";
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureVapidConfigured()) {
    return;
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

  for (const subscription of subscriptions) {
    const result = await sendPushNotification(subscription, payload);

    if (result === "stale") {
      await prisma.pushSubscription.delete({
        where: { id: subscription.id },
      });
    }
  }
}
