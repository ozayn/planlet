"use client";

import {
  POMODORO_NOTIFICATION_STORAGE_KEY,
  POMODORO_NOTIFICATION_TAG,
  POMODORO_OPEN_PATH,
} from "@/lib/pomodoro/constants";
import {
  getExistingPushSubscription,
  getPushSupportIssue,
  isSecurePushContext,
  registerPushServiceWorker,
  subscriptionToJson,
  urlBase64ToUint8Array,
} from "@/lib/push-client";

export type PomodoroNotificationKind = "focus-complete" | "break-complete";

export type PomodoroNotificationCopy = {
  title: string;
  body: string;
  kind: PomodoroNotificationKind;
};

export function getPomodoroNotificationCopy(
  kind: PomodoroNotificationKind,
): PomodoroNotificationCopy {
  if (kind === "focus-complete") {
    return {
      title: "Focus complete",
      body: "Time for a short break.",
      kind,
    };
  }

  return {
    title: "Break complete",
    body: "Ready for another focus session?",
    kind,
  };
}

export function pomodoroNotificationTagForPhase(
  transitionToken?: string | null,
): string {
  const token = transitionToken?.trim();
  return token
    ? `${POMODORO_NOTIFICATION_TAG}-${token}`
    : POMODORO_NOTIFICATION_TAG;
}

/** Browser Notification API support (local alerts). Independent of Web Push. */
export function getPomodoroNotificationSupportIssue(): string | null {
  if (typeof window === "undefined") {
    return "Notifications are unavailable.";
  }

  if (!isSecurePushContext()) {
    return "Notifications require HTTPS.";
  }

  if (!("Notification" in window)) {
    return "This browser does not support notifications.";
  }

  const pushIssue = getPushSupportIssue();
  if (pushIssue === "ios-requires-install") {
    return "On iPhone, install Planlet to your Home Screen first.";
  }

  return null;
}

export function getPomodoroNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function claimPomodoroNotificationDelivery(
  transitionToken?: string | null,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const token = transitionToken?.trim();
  if (!token) {
    return true;
  }

  const key = `${POMODORO_NOTIFICATION_STORAGE_KEY}:${token}`;

  try {
    if (window.localStorage.getItem(key)) {
      return false;
    }
    window.localStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

/**
 * Request permission (user gesture only). Best-effort Web Push subscribe
 * for background delivery — failure must not block local notifications.
 */
export async function requestPomodoroNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const supportIssue = getPomodoroNotificationSupportIssue();
  if (supportIssue?.includes("HTTPS") || supportIssue?.includes("Home Screen")) {
    return "unsupported";
  }

  try {
    await registerPushServiceWorker();
  } catch {
    // Registration may fail; Notification API can still work.
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "granted") {
    // Best-effort only — local completion alerts do not depend on this.
    await ensurePomodoroWebPushSubscription();
  }

  return permission;
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

async function showBrowserNotification(input: {
  title: string;
  body: string;
  kind: PomodoroNotificationKind | "test";
  tag: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const options = {
    body: input.body,
    tag: input.tag,
    renotify: false,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: POMODORO_OPEN_PATH,
      kind: input.kind,
    },
  } as NotificationOptions;

  try {
    let registration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await registerPushServiceWorker().catch(() => undefined));
    }

    if (registration?.showNotification) {
      await registration.showNotification(input.title, options);
      return true;
    }
  } catch {
    // Fall through to Notification constructor.
  }

  try {
    new Notification(input.title, options);
    return true;
  } catch {
    return false;
  }
}

export async function showPomodoroPhaseNotification(input: {
  kind: PomodoroNotificationKind;
  enabled: boolean;
  transitionToken?: string | null;
}): Promise<boolean> {
  if (!input.enabled || typeof window === "undefined") {
    return false;
  }

  if (!claimPomodoroNotificationDelivery(input.transitionToken)) {
    return false;
  }

  const copy = getPomodoroNotificationCopy(input.kind);
  return showBrowserNotification({
    title: copy.title,
    body: copy.body,
    kind: copy.kind,
    tag: pomodoroNotificationTagForPhase(input.transitionToken),
  });
}

/**
 * Settings → Pomodoro “Test notification”. Never creates a session or push job.
 */
export async function showTestPomodoroNotification(): Promise<{
  ok: boolean;
  permission: NotificationPermission | "unsupported";
  error?: string;
}> {
  const supportIssue = getPomodoroNotificationSupportIssue();
  if (supportIssue) {
    return {
      ok: false,
      permission: getPomodoroNotificationPermission(),
      error: supportIssue,
    };
  }

  let permission = getPomodoroNotificationPermission();
  if (permission === "unsupported") {
    return {
      ok: false,
      permission,
      error: "This browser does not support notifications.",
    };
  }

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return {
      ok: false,
      permission,
      error:
        permission === "denied"
          ? "Notifications are blocked. Enable them in your browser settings for this site."
          : "Notification permission was not granted.",
    };
  }

  const shown = await showBrowserNotification({
    title: "Focus complete",
    body: "Time for a short break.",
    kind: "test",
    tag: `${POMODORO_NOTIFICATION_TAG}-test`,
  });

  if (!shown) {
    return {
      ok: false,
      permission,
      error: "Could not show a notification in this browser.",
    };
  }

  return { ok: true, permission };
}
