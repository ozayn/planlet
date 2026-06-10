"use client";

import { useEffect, useState } from "react";

import {
  isInstalledPwa,
  isIosDevice,
  isPushApiSupported,
  registerPushServiceWorker,
  subscriptionToJson,
  urlBase64ToUint8Array,
} from "@/lib/push-client";

type PushPublicKeyResponse = {
  enabled: boolean;
  publicKey?: string;
};

type PushSettingsState =
  | "loading"
  | "unsupported"
  | "disabled"
  | "ios-install"
  | "default"
  | "subscribed"
  | "denied";

export function PushNotificationSettings() {
  const [state, setState] = useState<PushSettingsState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      if (!isPushApiSupported()) {
        if (!cancelled) {
          setState("unsupported");
        }
        return;
      }

      if (isIosDevice() && !isInstalledPwa()) {
        if (!cancelled) {
          setState("ios-install");
        }
        return;
      }

      try {
        const response = await fetch("/api/push/public-key");
        const data = (await response.json()) as PushPublicKeyResponse;

        if (!data.enabled || !data.publicKey) {
          if (!cancelled) {
            setState("disabled");
          }
          return;
        }

        if (!cancelled) {
          setPublicKey(data.publicKey);
        }

        if (Notification.permission === "denied") {
          if (!cancelled) {
            setState("denied");
          }
          return;
        }

        const registration = await registerPushServiceWorker();
        const subscription = await registration.pushManager.getSubscription();

        if (!cancelled) {
          setState(subscription ? "subscribed" : "default");
        }
      } catch {
        if (!cancelled) {
          setState("disabled");
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    if (!publicKey) {
      return;
    }

    setError(null);
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

      setState(Notification.permission === "denied" ? "denied" : "default");
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

  return (
    <div className="space-y-3">
      <h2 className="ui-label">Notifications</h2>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Phone notifications</p>

        {state === "loading" ? (
          <p className="text-sm text-muted">Checking notification support…</p>
        ) : null}

        {state === "unsupported" ? (
          <p className="text-sm text-muted">
            Phone notifications are not supported in this browser.
          </p>
        ) : null}

        {state === "disabled" ? (
          <p className="text-sm text-muted">
            Phone notifications are not available right now.
          </p>
        ) : null}

        {state === "ios-install" ? (
          <p className="text-sm text-muted">
            On iPhone, add Planlet to your Home Screen first, then open it from
            the icon to enable notifications.
          </p>
        ) : null}

        {state === "denied" ? (
          <p className="text-sm text-muted">
            Notifications are blocked in your browser settings.
          </p>
        ) : null}

        {state === "default" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-light">
              Get a system notification when someone shares a plan with you or
              sends kudos.
            </p>
            <button
              type="button"
              onClick={handleEnable}
              disabled={isWorking}
              className="ui-btn-secondary"
            >
              {isWorking ? "Enabling…" : "Enable notifications"}
            </button>
          </div>
        ) : null}

        {state === "subscribed" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">Notifications enabled</p>
            <button
              type="button"
              onClick={handleDisable}
              disabled={isWorking}
              className="ui-btn-secondary ui-btn-compact"
            >
              {isWorking ? "Turning off…" : "Turn off"}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
