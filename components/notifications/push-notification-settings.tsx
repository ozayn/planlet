"use client";

import { useEffect, useState } from "react";

import { SettingsPlatformDetails } from "@/components/settings/settings-platform-details";
import {
  getExistingPushSubscription,
  getPushSupportIssue,
  registerPushServiceWorker,
  subscriptionToJson,
  urlBase64ToUint8Array,
  type PushSupportIssue,
} from "@/lib/push-client";

type PushPublicKeyResponse = {
  enabled: boolean;
  publicKey?: string;
  reason?: string;
};

type PushSettingsState =
  | "loading"
  | "unsupported"
  | "requires-https"
  | "ios-install"
  | "keys-not-configured"
  | "sw-registration-failed"
  | "denied"
  | "default"
  | "subscribed";

const SUPPORT_ISSUE_MESSAGES: Record<PushSupportIssue, string> = {
  "no-window": "Browser does not support push notifications.",
  "no-service-worker": "Browser does not support push notifications.",
  "no-push-manager": "Browser does not support push notifications.",
  "no-notification": "Browser does not support push notifications.",
  "requires-https": "Notifications require HTTPS.",
  "ios-requires-install":
    "On iPhone, install Planlet to your Home Screen first.",
};

const STATE_MESSAGES: Record<
  Exclude<
    PushSettingsState,
    "loading" | "default" | "subscribed" | "unsupported"
  >,
  string
> = {
  "requires-https": "Notifications require HTTPS.",
  "ios-install": "On iPhone, install Planlet to your Home Screen first.",
  "keys-not-configured": "Push keys are not configured.",
  "sw-registration-failed": "Service worker could not register.",
  denied: "Notification permission was denied.",
};

function logPushSettings(
  state: PushSettingsState,
  details: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "development") {
    console.info("[push-settings]", { state, ...details });
  }
}

type TestNotificationStatus = "idle" | "sending" | "success" | "error";

type PushTestResponse = {
  ok?: boolean;
  message?: string;
  sent?: number;
};

function getFriendlyTestError(message: string): string {
  if (message.includes("No push subscription found")) {
    return "No push subscription found. Enable phone notifications again.";
  }

  if (message.includes("subscription expired")) {
    return "This notification subscription expired. Enable phone notifications again.";
  }

  if (message.includes("Push keys are not configured")) {
    return "Push keys are not configured.";
  }

  if (message.includes("permission")) {
    return "Notification permission is not granted.";
  }

  return message || "Couldn't send test notification.";
}

type PushNotificationSettingsProps = {
  /** When true, omit section heading and use compact copy for settings list. */
  embedded?: boolean;
  onSubscriptionChange?: (subscribed: boolean) => void;
};

export function PushNotificationSettings({
  embedded = false,
  onSubscriptionChange,
}: PushNotificationSettingsProps) {
  const [state, setState] = useState<PushSettingsState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestNotificationStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      const supportIssue = getPushSupportIssue();

      if (supportIssue) {
        if (!cancelled) {
          const nextState =
            supportIssue === "requires-https"
              ? "requires-https"
              : supportIssue === "ios-requires-install"
                ? "ios-install"
                : "unsupported";
          setState(nextState);
          logPushSettings(nextState, { supportIssue });
        }
        return;
      }

      try {
        const response = await fetch("/api/push/public-key");

        if (!response.ok) {
          if (!cancelled) {
            setState("keys-not-configured");
            logPushSettings("keys-not-configured", {
              reason: "public_key_request_failed",
              status: response.status,
            });
          }
          return;
        }

        const data = (await response.json()) as PushPublicKeyResponse;

        if (!data.enabled || !data.publicKey) {
          if (!cancelled) {
            setState("keys-not-configured");
            logPushSettings("keys-not-configured", {
              reason: data.reason ?? "disabled",
            });
          }
          return;
        }

        if (!cancelled) {
          setPublicKey(data.publicKey);
        }

        if (Notification.permission === "denied") {
          if (!cancelled) {
            setState("denied");
            logPushSettings("denied", { permission: "denied" });
          }
          return;
        }

        const subscription = await getExistingPushSubscription();

        if (!cancelled) {
          const subscribed = Boolean(subscription);
          const nextState = subscribed ? "subscribed" : "default";
          setState(nextState);
          onSubscriptionChange?.(subscribed);
          logPushSettings(nextState, {
            permission: Notification.permission,
            subscribed,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setState("sw-registration-failed");
          logPushSettings("sw-registration-failed", {
            message:
              loadError instanceof Error ? loadError.message : "Unknown error",
          });
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [onSubscriptionChange]);

  async function handleEnable() {
    if (!publicKey) {
      return;
    }

    setError(null);
    setTestStatus("idle");
    setTestError(null);
    setIsWorking(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setState("denied");
        return;
      }

      if (permission !== "granted") {
        setError("Notification permission was not granted.");
        return;
      }

      const registration = await registerPushServiceWorker();
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionToJson(subscription)),
      });

      if (!response.ok) {
        throw new Error("Failed to save push subscription.");
      }

      setState("subscribed");
      onSubscriptionChange?.(true);
    } catch (enableError) {
      setError(
        enableError instanceof Error
          ? enableError.message
          : "Failed to enable notifications.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setTestStatus("idle");
    setTestError(null);
    setIsWorking(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpoint ? { endpoint } : {}),
      });

      const nextState =
        Notification.permission === "denied" ? "denied" : "default";
      setState(nextState);
      onSubscriptionChange?.(false);
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Failed to turn off notifications.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSendTest() {
    setError(null);
    setTestError(null);
    setTestStatus("sending");

    if (Notification.permission !== "granted") {
      setTestStatus("error");
      setTestError("Notification permission is not granted.");
      return;
    }

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | PushTestResponse
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.message ?? "Couldn't send test notification.",
        );
      }

      setTestStatus("success");
      logPushSettings("subscribed", {
        action: "test_notification_sent",
        sent: data.sent ?? 0,
      });
    } catch (sendTestError) {
      const message =
        sendTestError instanceof Error
          ? sendTestError.message
          : "Couldn't send test notification.";
      setTestStatus("error");
      setTestError(getFriendlyTestError(message));
      logPushSettings("subscribed", {
        action: "test_notification_failed",
        message,
      });
    }
  }

  const rowClass = embedded ? "ui-settings-row-block" : "space-y-2";
  const statusMessage =
    state === "unsupported"
      ? SUPPORT_ISSUE_MESSAGES["no-service-worker"]
      : state === "loading"
        ? null
        : state === "default"
          ? "Not enabled"
          : state === "subscribed"
            ? "Enabled"
            : STATE_MESSAGES[state];

  return (
    <div className={embedded ? "" : "space-y-3"}>
      {embedded ? null : <h2 className="ui-label">Notifications</h2>}

      <div className={rowClass}>
        <p className="ui-settings-subsection-title">Phone notifications</p>

        {state === "loading" ? (
          <p className="ui-settings-subsection-status">Checking…</p>
        ) : null}

        {statusMessage ? (
          <p className="ui-settings-subsection-status">{statusMessage}</p>
        ) : null}

        {state === "default" ? (
          <button
            type="button"
            onClick={handleEnable}
            disabled={isWorking}
            className="ui-btn-secondary ui-btn-compact min-h-10"
          >
            {isWorking ? "Enabling…" : "Enable phone notifications"}
          </button>
        ) : null}

        {state === "subscribed" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testStatus === "sending" || isWorking}
                className="ui-btn-secondary ui-btn-compact min-h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testStatus === "sending"
                  ? "Sending…"
                  : "Send test notification"}
              </button>
              <button
                type="button"
                onClick={handleDisable}
                disabled={isWorking || testStatus === "sending"}
                className="ui-btn-secondary ui-btn-compact min-h-9 px-3 text-xs"
              >
                {isWorking ? "Disabling…" : "Disable phone notifications"}
              </button>
            </div>

            {testStatus === "success" ? (
              <p className="text-sm text-foreground" role="status">
                Test notification sent.
              </p>
            ) : null}

            {testStatus === "error" && testError ? (
              <p className="text-sm text-accent-red" role="alert">
                {testError}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}

        {embedded ? (
          <div className="ui-settings-platform-rows">
            <SettingsPlatformDetails label="Apple / iPhone">
              <p className="text-xs leading-relaxed text-muted">
                Install Planlet to your Home Screen first. Then open it from the
                new icon to enable notifications.
              </p>
            </SettingsPlatformDetails>
            <SettingsPlatformDetails label="Android">
              <p className="text-xs leading-relaxed text-muted">
                Open Planlet in Chrome and allow notifications when prompted.
              </p>
            </SettingsPlatformDetails>
          </div>
        ) : null}
      </div>
    </div>
  );
}
