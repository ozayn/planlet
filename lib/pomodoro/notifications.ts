"use client";

import {
  POMODORO_NOTIFICATION_TAG,
  POMODORO_OPEN_PATH,
} from "@/lib/pomodoro/constants";
import {
  getExistingPushSubscription,
  getPushSupportIssue,
  registerPushServiceWorker,
  subscriptionToJson,
  urlBase64ToUint8Array,
} from "@/lib/push-client";

export type PomodoroNotificationKind = "focus-complete" | "break-complete";

export function getPomodoroNotificationSupportIssue(): string | null {
  if (typeof window === "undefined") {
    return "Notifications are unavailable.";
  }

  const pushIssue = getPushSupportIssue();
  if (pushIssue === "requires-https") {
    return "Notifications require HTTPS.";
  }
  if (pushIssue === "ios-requires-install") {
    return "On iPhone, install Planlet to your Home Screen first.";
  }
  if (pushIssue === "no-push-manager" || pushIssue === "no-service-worker") {
    return "This browser does not support push notifications.";
  }

  if (!("Notification" in window)) {
    return "This browser does not support notifications.";
  }

  return null;
}

/**
 * Request permission (user gesture only) and register a Web Push subscription
 * so server-scheduled Pomodoro completion alerts can deliver in the background.
 */
export async function requestPomodoroNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  const issue = getPomodoroNotificationSupportIssue();
  if (issue && !issue.includes("Home Screen") && !issue.includes("HTTPS")) {
    // Still allow Notification permission on platforms without PushManager.
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    await registerPushServiceWorker();
  } catch {
    // Registration may fail on insecure origins; permission can still work.
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return permission;
  }

  await ensurePomodoroWebPushSubscription();
  return "granted";
}

export async function ensurePomodoroWebPushSubscription(): Promise<{
  subscribed: boolean;
  error?: string;
}> {
  const supportIssue = getPushSupportIssue();
  if (supportIssue) {
    return {
      subscribed: false,
      error:
        supportIssue === "ios-requires-install"
          ? "On iPhone, install Planlet to your Home Screen first."
          : supportIssue === "requires-https"
            ? "Notifications require HTTPS."
            : "Push notifications are unavailable in this browser.",
    };
  }

  try {
    const keyResponse = await fetch("/api/push/public-key");
    const keyData = (await keyResponse.json()) as {
      enabled?: boolean;
      publicKey?: string;
      reason?: string;
    };

    if (!keyData.enabled || !keyData.publicKey) {
      return {
        subscribed: false,
        error: "Push keys are not configured on this server.",
      };
    }

    const registration = await registerPushServiceWorker();
    let subscription =
      (await registration.pushManager.getSubscription()) ??
      (await getExistingPushSubscription());

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscriptionToJson(subscription)),
    });

    if (!response.ok) {
      return { subscribed: false, error: "Failed to save push subscription." };
    }

    return { subscribed: true };
  } catch (error) {
    return {
      subscribed: false,
      error: error instanceof Error ? error.message : "Push subscribe failed.",
    };
  }
}

export async function showPomodoroPhaseNotification(input: {
  kind: PomodoroNotificationKind;
  enabled: boolean;
}): Promise<void> {
  if (!input.enabled || typeof window === "undefined") {
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const title =
    input.kind === "focus-complete" ? "Focus complete" : "Break complete";
  const body =
    input.kind === "focus-complete"
      ? "Time for a break."
      : "Ready for another focus session?";

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag: POMODORO_NOTIFICATION_TAG,
        data: {
          url: POMODORO_OPEN_PATH,
          kind: input.kind,
        },
      });
      return;
    }
  } catch {
    // Fall through to Notification constructor.
  }

  try {
    new Notification(title, {
      body,
      tag: POMODORO_NOTIFICATION_TAG,
      data: { url: POMODORO_OPEN_PATH, kind: input.kind },
    });
  } catch {
    // Best-effort only.
  }
}
