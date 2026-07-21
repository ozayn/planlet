"use client";

import { useState, useTransition } from "react";

import {
  areActiveTimerNotificationsEnabled,
  clearActiveTimerNotification,
  getActiveTimerNotificationSupportIssue,
  requestActiveTimerNotificationPermission,
  setActiveTimerNotificationsEnabled,
  supportsNotificationActionButtons,
} from "@/lib/activity-timer/active-notification";

type ActiveTimerNotificationSettingsProps = {
  embedded?: boolean;
};

export function ActiveTimerNotificationSettings({
  embedded = false,
}: ActiveTimerNotificationSettingsProps) {
  const [enabled, setEnabled] = useState(() =>
    areActiveTimerNotificationsEnabled(),
  );
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === "undefined" ? "denied" : Notification.permission,
  );
  const [supportIssue, setSupportIssue] = useState(() =>
    getActiveTimerNotificationSupportIssue(),
  );
  const [actionsSupported, setActionsSupported] = useState(() =>
    supportsNotificationActionButtons(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEnable() {
    setMessage(null);
    startTransition(async () => {
      const nextPermission = await requestActiveTimerNotificationPermission();
      const nextActionsSupported = supportsNotificationActionButtons();
      setPermission(nextPermission);
      setSupportIssue(getActiveTimerNotificationSupportIssue());
      setActionsSupported(nextActionsSupported);

      if (nextPermission !== "granted") {
        setEnabled(false);
        setMessage(
          nextPermission === "denied"
            ? "Notification permission was denied."
            : "Could not enable active timer notifications.",
        );
        return;
      }

      setEnabled(true);
      setMessage(
        nextActionsSupported
          ? "Active timer notifications enabled. Stop is available when your device supports it."
          : "Active timer notifications enabled. Tap the notification to open the Timer.",
      );
    });
  }

  function handleDisable() {
    setMessage(null);
    setActiveTimerNotificationsEnabled(false);
    setEnabled(false);
    void clearActiveTimerNotification();
  }

  const helper =
    "Show the running timer on your lock screen or notification area when supported.";

  return (
    <div className={embedded ? "space-y-3" : "ui-card-padded space-y-3"}>
      {!embedded ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Active timer notification
          </h2>
          <p className="mt-1 text-sm text-muted">{helper}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">{helper}</p>
      )}

      {supportIssue === "ios-requires-install" ? (
        <p className="text-sm text-muted">
          On iPhone, install Planlet to your Home Screen first.
        </p>
      ) : supportIssue === "requires-https" ? (
        <p className="text-sm text-muted">Notifications require HTTPS.</p>
      ) : supportIssue ? (
        <p className="text-sm text-muted">
          This browser does not support active timer notifications.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {enabled && permission === "granted" ? (
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={handleDisable}
              disabled={isPending}
            >
              Disable
            </button>
          ) : (
            <button
              type="button"
              className="ui-btn-primary"
              onClick={handleEnable}
              disabled={isPending}
            >
              Enable
            </button>
          )}
          <span className="text-sm text-muted">
            {enabled && permission === "granted" ? "On" : "Off"}
          </span>
        </div>
      )}

      {!actionsSupported && enabled && permission === "granted" ? (
        <p className="text-xs text-muted-light">
          Lock-screen Stop is not available on this device. Tap the notification
          to open Timer and stop there.
        </p>
      ) : null}

      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
