import {
  ACTIVITY_TIMER_ACTIVE_NOTIFICATION_STORAGE_KEY,
  ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG,
  ACTIVITY_TIMER_OPEN_PATH,
  type SerializedActiveActivityTimerSession,
} from "@/lib/activity-timer/constants";
import {
  activeElapsedSecondsFromSession,
  displaySecondsForTimerMode,
} from "@/lib/activity-timer/countdown";
import { formatActivityClock } from "@/lib/activity-timer/format";
import {
  getPushSupportIssue,
  isSecurePushContext,
  registerPushServiceWorker,
} from "@/lib/push-client";

export type ActiveTimerNotificationKind = "active" | "complete";

export type ActiveTimerNotificationPayload = {
  kind: ActiveTimerNotificationKind;
  title: string;
  body: string;
  url: string;
  tag: string;
  renotify: false;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
};

export function areActiveTimerNotificationsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(
        ACTIVITY_TIMER_ACTIVE_NOTIFICATION_STORAGE_KEY,
      ) === "true"
    );
  } catch {
    return false;
  }
}

export function setActiveTimerNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(
        ACTIVITY_TIMER_ACTIVE_NOTIFICATION_STORAGE_KEY,
        "true",
      );
    } else {
      window.localStorage.removeItem(
        ACTIVITY_TIMER_ACTIVE_NOTIFICATION_STORAGE_KEY,
      );
    }
  } catch {
    // Preference persistence is best-effort.
  }
}

export function getActiveTimerNotificationSupportIssue():
  | "no-window"
  | "requires-https"
  | "no-service-worker"
  | "no-notification"
  | "ios-requires-install"
  | null {
  if (typeof window === "undefined") {
    return "no-window";
  }

  if (!isSecurePushContext()) {
    return "requires-https";
  }

  if (!("serviceWorker" in navigator)) {
    return "no-service-worker";
  }

  if (!("Notification" in window)) {
    return "no-notification";
  }

  const pushIssue = getPushSupportIssue();
  if (pushIssue === "ios-requires-install") {
    return "ios-requires-install";
  }

  return null;
}

export function supportsNotificationActionButtons(): boolean {
  if (typeof Notification === "undefined") {
    return false;
  }

  const maxActions = (
    Notification as typeof Notification & { maxActions?: number }
  ).maxActions;

  return typeof maxActions === "number" ? maxActions > 0 : false;
}

export function buildActiveTimerNotificationBody(
  session: SerializedActiveActivityTimerSession,
  nowMs = Date.now(),
): string {
  const elapsed = activeElapsedSecondsFromSession({
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    accumulatedPausedSeconds: session.accumulatedPausedSeconds,
    nowMs,
  });
  const clock = formatActivityClock(
    displaySecondsForTimerMode(
      session.timerMode,
      elapsed,
      session.targetDurationSeconds,
    ),
  );

  if (session.pausedAt) {
    return `${session.title} · Paused at ${clock}`;
  }

  if (session.timerMode === "countDown") {
    return `${session.title} · ${clock} remaining`;
  }

  return `${session.title} · ${clock} elapsed`;
}

export function buildActiveTimerNotificationPayload(
  session: SerializedActiveActivityTimerSession,
  nowMs = Date.now(),
): ActiveTimerNotificationPayload {
  const includeActions = supportsNotificationActionButtons();
  const actions = includeActions
    ? [
        { action: "stop-timer", title: "Stop" },
        { action: "open-timer", title: "Open" },
      ]
    : undefined;

  return {
    kind: "active",
    title: "Planlet Timer",
    body: buildActiveTimerNotificationBody(session, nowMs),
    url: ACTIVITY_TIMER_OPEN_PATH,
    tag: ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG,
    renotify: false,
    requireInteraction: true,
    actions,
  };
}

export function buildCompletedTimerNotificationPayload(
  title: string,
): ActiveTimerNotificationPayload {
  return {
    kind: "complete",
    title: "Planlet Timer",
    body: `${title} complete`,
    url: ACTIVITY_TIMER_OPEN_PATH,
    tag: ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG,
    renotify: false,
    requireInteraction: false,
  };
}

async function showViaServiceWorker(
  payload: ActiveTimerNotificationPayload,
): Promise<boolean> {
  const registration = await registerPushServiceWorker();

  await registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    renotify: payload.renotify,
    requireInteraction: payload.requireInteraction,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: payload.url,
      kind: payload.kind,
    },
    ...(payload.actions ? { actions: payload.actions } : {}),
  } as NotificationOptions);

  return true;
}

export async function showActiveTimerNotification(
  session: SerializedActiveActivityTimerSession,
  nowMs = Date.now(),
): Promise<boolean> {
  if (
    !areActiveTimerNotificationsEnabled() ||
    Notification.permission !== "granted" ||
    getActiveTimerNotificationSupportIssue()
  ) {
    return false;
  }

  try {
    return await showViaServiceWorker(
      buildActiveTimerNotificationPayload(session, nowMs),
    );
  } catch {
    return false;
  }
}

export async function showCompletedTimerNotification(
  title: string,
): Promise<boolean> {
  if (
    !areActiveTimerNotificationsEnabled() ||
    Notification.permission !== "granted" ||
    getActiveTimerNotificationSupportIssue()
  ) {
    return false;
  }

  try {
    return await showViaServiceWorker(
      buildCompletedTimerNotificationPayload(title),
    );
  } catch {
    return false;
  }
}

export async function clearActiveTimerNotification(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return;
    }

    const notifications = await registration.getNotifications({
      tag: ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG,
    });

    for (const notification of notifications) {
      notification.close();
    }
  } catch {
    // Clearing is best-effort.
  }
}

export async function requestActiveTimerNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  const supportIssue = getActiveTimerNotificationSupportIssue();
  if (supportIssue) {
    return "denied";
  }

  await registerPushServiceWorker();

  if (Notification.permission === "granted") {
    setActiveTimerNotificationsEnabled(true);
    return "granted";
  }

  if (Notification.permission === "denied") {
    setActiveTimerNotificationsEnabled(false);
    return "denied";
  }

  const permission = await Notification.requestPermission();
  setActiveTimerNotificationsEnabled(permission === "granted");
  return permission;
}

export function shouldRefreshActiveTimerNotification(input: {
  elapsedSeconds: number;
  previousElapsedSeconds: number | null;
  timerMode: SerializedActiveActivityTimerSession["timerMode"];
  targetDurationSeconds?: number | null;
}): boolean {
  const {
    elapsedSeconds,
    previousElapsedSeconds,
    timerMode,
    targetDurationSeconds,
  } = input;

  if (previousElapsedSeconds == null) {
    return true;
  }

  if (
    timerMode === "countDown" &&
    targetDurationSeconds != null &&
    targetDurationSeconds > 0
  ) {
    const remaining = Math.max(0, targetDurationSeconds - elapsedSeconds);
    const previousRemaining = Math.max(
      0,
      targetDurationSeconds - previousElapsedSeconds,
    );
    const thresholds = [60, 30, 10, 5, 0];

    return thresholds.some(
      (threshold) =>
        previousRemaining > threshold && remaining <= threshold,
    );
  }

  return (
    Math.floor(elapsedSeconds / 60) > Math.floor(previousElapsedSeconds / 60)
  );
}
