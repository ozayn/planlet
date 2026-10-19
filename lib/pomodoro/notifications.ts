"use client";

import {
  POMODORO_NOTIFICATION_STORAGE_KEY,
  POMODORO_NOTIFICATION_TAG,
  POMODORO_OPEN_PATH,
} from "@/lib/pomodoro/constants";
import {
  getExistingPushSubscription,
  getPushSupportIssue,
  getServiceWorkerRegistrationState,
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

export type PomodoroNotificationMethod =
  | "service-worker"
  | "notification-constructor"
  | "none";

export type PomodoroNotificationDelivery = {
  /** Browser accepted the show request without throwing. */
  accepted: boolean;
  /** A notification with the expected tag was found via getNotifications(). */
  confirmed: boolean;
  method: PomodoroNotificationMethod;
  error?: string;
};

export type PomodoroNotificationDiagnostics = {
  permission: NotificationPermission | "unsupported";
  secureContext: boolean;
  documentHidden: boolean;
  serviceWorker: {
    supported: boolean;
    controller: boolean;
    registration: boolean;
    active: boolean;
    scope: string | null;
  };
  pushSubscription: boolean | null;
  method: PomodoroNotificationMethod;
  accepted: boolean;
  confirmed: boolean;
  getNotificationsCount: number;
  error?: string;
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

function logPomodoroNotificationDiagnostics(
  diagnostics: PomodoroNotificationDiagnostics,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[pomodoro-notification]", {
    permission: diagnostics.permission,
    secureContext: diagnostics.secureContext,
    documentHidden: diagnostics.documentHidden,
    serviceWorker: diagnostics.serviceWorker,
    pushSubscription: diagnostics.pushSubscription,
    method: diagnostics.method,
    accepted: diagnostics.accepted,
    confirmed: diagnostics.confirmed,
    getNotificationsCount: diagnostics.getNotificationsCount,
    error: diagnostics.error,
  });
}

async function collectBaseDiagnostics(): Promise<
  Omit<
    PomodoroNotificationDiagnostics,
    | "method"
    | "accepted"
    | "confirmed"
    | "getNotificationsCount"
    | "error"
  >
> {
  const sw = await getServiceWorkerRegistrationState();
  let pushSubscription: boolean | null = null;

  try {
    if (sw.supported && sw.active) {
      pushSubscription = Boolean(await getExistingPushSubscription());
    }
  } catch {
    pushSubscription = null;
  }

  return {
    permission: getPomodoroNotificationPermission(),
    secureContext: isSecurePushContext(),
    documentHidden:
      typeof document !== "undefined" ? document.visibilityState === "hidden" : false,
    serviceWorker: sw,
    pushSubscription,
  };
}

async function countNotificationsWithTag(
  registration: ServiceWorkerRegistration,
  tag: string,
): Promise<number> {
  try {
    // Allow the browser a tick to register the notification.
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 50);
    });
    const notifications = await registration.getNotifications({ tag });
    return notifications.length;
  } catch {
    return 0;
  }
}

async function showViaServiceWorker(input: {
  title: string;
  body: string;
  kind: PomodoroNotificationKind | "test";
  tag: string;
  renotify: boolean;
  requireInteraction: boolean;
}): Promise<PomodoroNotificationDelivery & { getNotificationsCount: number }> {
  const registration = await registerPushServiceWorker();

  if (!registration.active) {
    return {
      accepted: false,
      confirmed: false,
      method: "none",
      getNotificationsCount: 0,
      error: "Service worker is registered but not active.",
    };
  }

  try {
    const existing = await registration.getNotifications({ tag: input.tag });
    await Promise.all(existing.map((notification) => notification.close()));
  } catch {
    // Best-effort cleanup before showing a fresh test/phase alert.
  }

  const options = {
    body: input.body,
    tag: input.tag,
    renotify: input.renotify,
    requireInteraction: input.requireInteraction,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: POMODORO_OPEN_PATH,
      kind: input.kind,
    },
  } as NotificationOptions;

  await registration.showNotification(input.title, options);
  const count = await countNotificationsWithTag(registration, input.tag);

  return {
    accepted: true,
    confirmed: count > 0,
    method: "service-worker",
    getNotificationsCount: count,
    error:
      count > 0
        ? undefined
        : "Browser accepted the notification, but none is visible yet. Check Focus / Do Not Disturb and site notification settings.",
  };
}

async function showViaNotificationConstructor(input: {
  title: string;
  body: string;
  kind: PomodoroNotificationKind | "test";
  tag: string;
  renotify: boolean;
  requireInteraction: boolean;
}): Promise<PomodoroNotificationDelivery & { getNotificationsCount: number }> {
  const options = {
    body: input.body,
    tag: input.tag,
    renotify: input.renotify,
    requireInteraction: input.requireInteraction,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: POMODORO_OPEN_PATH,
      kind: input.kind,
    },
  } as NotificationOptions;

  const notification = new Notification(input.title, options);

  // Chrome often suppresses constructor notifications while the tab is focused.
  let confirmed = false;
  let count = 0;
  try {
    if ("serviceWorker" in navigator) {
      const registration =
        (await navigator.serviceWorker.getRegistration("/")) ??
        (await navigator.serviceWorker.getRegistration());
      if (registration) {
        count = await countNotificationsWithTag(registration, input.tag);
        confirmed = count > 0;
      }
    }
  } catch {
    // Keep accepted=true; confirmation unknown.
  }

  if (!confirmed && typeof document !== "undefined" && !document.hidden) {
    notification.close();
    return {
      accepted: true,
      confirmed: false,
      method: "notification-constructor",
      getNotificationsCount: count,
      error:
        "Chrome may hide page notifications while this tab is focused. Enable the service worker path or check OS Focus settings.",
    };
  }

  return {
    accepted: true,
    confirmed,
    method: "notification-constructor",
    getNotificationsCount: count,
  };
}

async function showBrowserNotification(input: {
  title: string;
  body: string;
  kind: PomodoroNotificationKind | "test";
  tag: string;
  renotify?: boolean;
  requireInteraction?: boolean;
}): Promise<
  PomodoroNotificationDelivery & {
    diagnostics: PomodoroNotificationDiagnostics;
  }
> {
  const base = await collectBaseDiagnostics();
  const renotify = input.renotify ?? false;
  const requireInteraction = input.requireInteraction ?? false;

  if (typeof window === "undefined" || !("Notification" in window)) {
    const diagnostics: PomodoroNotificationDiagnostics = {
      ...base,
      method: "none",
      accepted: false,
      confirmed: false,
      getNotificationsCount: 0,
      error: "This browser does not support notifications.",
    };
    logPomodoroNotificationDiagnostics(diagnostics);
    return {
      accepted: false,
      confirmed: false,
      method: "none",
      error: diagnostics.error,
      diagnostics,
    };
  }

  if (Notification.permission !== "granted") {
    const diagnostics: PomodoroNotificationDiagnostics = {
      ...base,
      method: "none",
      accepted: false,
      confirmed: false,
      getNotificationsCount: 0,
      error: "Notification permission is not granted.",
    };
    logPomodoroNotificationDiagnostics(diagnostics);
    return {
      accepted: false,
      confirmed: false,
      method: "none",
      error: diagnostics.error,
      diagnostics,
    };
  }

  let swError: string | undefined;

  if ("serviceWorker" in navigator) {
    try {
      const viaSw = await showViaServiceWorker({
        title: input.title,
        body: input.body,
        kind: input.kind,
        tag: input.tag,
        renotify,
        requireInteraction,
      });

      const diagnostics: PomodoroNotificationDiagnostics = {
        ...(await collectBaseDiagnostics()),
        method: viaSw.method,
        accepted: viaSw.accepted,
        confirmed: viaSw.confirmed,
        getNotificationsCount: viaSw.getNotificationsCount,
        error: viaSw.error,
      };
      logPomodoroNotificationDiagnostics(diagnostics);

      if (viaSw.confirmed || viaSw.accepted) {
        return { ...viaSw, diagnostics };
      }

      swError = viaSw.error;
    } catch (error) {
      swError =
        error instanceof Error
          ? error.message
          : "Service worker notification failed.";
    }
  }

  try {
    const viaCtor = await showViaNotificationConstructor({
      title: input.title,
      body: input.body,
      kind: input.kind,
      tag: input.tag,
      renotify,
      requireInteraction,
    });

    const diagnostics: PomodoroNotificationDiagnostics = {
      ...(await collectBaseDiagnostics()),
      method: viaCtor.method,
      accepted: viaCtor.accepted,
      confirmed: viaCtor.confirmed,
      getNotificationsCount: viaCtor.getNotificationsCount,
      error: viaCtor.error ?? swError,
    };
    logPomodoroNotificationDiagnostics(diagnostics);
    return { ...viaCtor, diagnostics };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not show a notification in this browser.";
    const diagnostics: PomodoroNotificationDiagnostics = {
      ...(await collectBaseDiagnostics()),
      method: "none",
      accepted: false,
      confirmed: false,
      getNotificationsCount: 0,
      error: swError ? `${swError} Fallback failed: ${message}` : message,
    };
    logPomodoroNotificationDiagnostics(diagnostics);
    return {
      accepted: false,
      confirmed: false,
      method: "none",
      error: diagnostics.error,
      diagnostics,
    };
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
  const result = await showBrowserNotification({
    title: copy.title,
    body: copy.body,
    kind: copy.kind,
    tag: pomodoroNotificationTagForPhase(input.transitionToken),
    renotify: false,
    requireInteraction: false,
  });

  return result.confirmed || result.accepted;
}

/**
 * Settings → Pomodoro “Test notification”. Never creates a session or push job.
 */
export async function showTestPomodoroNotification(): Promise<{
  ok: boolean;
  /** True only when a notification with the test tag was found after show. */
  confirmed: boolean;
  permission: NotificationPermission | "unsupported";
  error?: string;
  diagnostics?: PomodoroNotificationDiagnostics;
}> {
  const supportIssue = getPomodoroNotificationSupportIssue();
  if (supportIssue) {
    return {
      ok: false,
      confirmed: false,
      permission: getPomodoroNotificationPermission(),
      error: supportIssue,
    };
  }

  let permission = getPomodoroNotificationPermission();
  if (permission === "unsupported") {
    return {
      ok: false,
      confirmed: false,
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
      confirmed: false,
      permission,
      error:
        permission === "denied"
          ? "Notifications are blocked. Enable them in your browser settings for this site."
          : "Notification permission was not granted.",
    };
  }

  // Unique tag so repeated tests reappear; renotify keeps the banner visible.
  const tag = `${POMODORO_NOTIFICATION_TAG}-test-${Date.now()}`;
  const result = await showBrowserNotification({
    title: "Focus complete",
    body: "Time for a short break.",
    kind: "test",
    tag,
    renotify: true,
    requireInteraction: true,
  });

  if (!result.accepted) {
    return {
      ok: false,
      confirmed: false,
      permission,
      error: result.error ?? "Could not show a notification in this browser.",
      diagnostics: result.diagnostics,
    };
  }

  if (!result.confirmed) {
    return {
      ok: false,
      confirmed: false,
      permission,
      error:
        result.error ??
        "Notification request was accepted, but nothing is visible. Check Focus / Do Not Disturb and Chrome notification settings for Planlet.",
      diagnostics: result.diagnostics,
    };
  }

  return {
    ok: true,
    confirmed: true,
    permission,
    diagnostics: result.diagnostics,
  };
}
