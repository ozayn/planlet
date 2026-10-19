"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePomodoroPreferencesAction } from "@/app/(app)/pomodoro/actions";
import type { PomodoroPreferences } from "@/lib/pomodoro/constants";
import {
  ensurePomodoroWebPushSubscription,
  getPomodoroNotificationPermission,
  getPomodoroNotificationSupportIssue,
  requestPomodoroNotificationPermission,
  showTestPomodoroNotification,
  type PomodoroNotificationDiagnostics,
} from "@/lib/pomodoro/notifications";
import {
  secondsToMinutes,
  minutesToSeconds,
} from "@/lib/pomodoro/preferences";

type PomodoroSettingsProps = {
  preferences: PomodoroPreferences;
  embedded?: boolean;
};

function DurationField({
  label,
  minutes,
  onChange,
  disabled,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-muted">
        <input
          type="number"
          min={1}
          max={180}
          value={minutes}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="ui-input w-16 text-center"
        />
        <span className="text-xs">min</span>
      </span>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-foreground"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </label>
  );
}

function permissionStatusLabel(
  permission: NotificationPermission | "unsupported",
): string | null {
  if (permission === "granted") {
    return null;
  }
  if (permission === "denied") {
    return "Blocked in browser settings for this site.";
  }
  if (permission === "default") {
    return "Permission not requested yet.";
  }
  return "Unavailable in this browser.";
}

export function PomodoroSettings({
  preferences: initial,
  embedded = false,
}: PomodoroSettingsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [supportIssue, setSupportIssue] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] =
    useState<PomodoroNotificationDiagnostics | null>(null);
  const showDiagnostics = process.env.NODE_ENV === "development";

  useEffect(() => {
    setPermission(getPomodoroNotificationPermission());
    setSupportIssue(getPomodoroNotificationSupportIssue());
  }, []);

  function save(patch: Partial<PomodoroPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setError(null);

    startTransition(async () => {
      const result = await updatePomodoroPreferencesAction(next);
      if (!result.success) {
        setError(result.error);
        setPreferences(initial);
        return;
      }
      setPreferences(result.preferences);
      router.refresh();
    });
  }

  async function enableNotifications() {
    setError(null);
    setStatus(null);

    if (supportIssue?.includes("Home Screen") || supportIssue?.includes("HTTPS")) {
      setError(supportIssue);
      return;
    }

    const nextPermission = await requestPomodoroNotificationPermission();
    setPermission(nextPermission);
    setSupportIssue(getPomodoroNotificationSupportIssue());

    if (nextPermission !== "granted") {
      setError(
        nextPermission === "denied"
          ? "Notifications are blocked. Enable them in your browser settings for this site."
          : supportIssue ?? "Notification permission was not granted.",
      );
      return;
    }

    save({ notificationsEnabled: true });

    const push = await ensurePomodoroWebPushSubscription();
    if (!push.subscribed) {
      setStatus(
        push.error
          ? `Enabled for this browser. Background push unavailable: ${push.error}`
          : "Enabled for this browser. Background push is unavailable locally.",
      );
      return;
    }

    setStatus("Enabled.");
  }

  function disableNotifications() {
    setError(null);
    setStatus(null);
    save({ notificationsEnabled: false });
  }

  function handleTestNotification() {
    setError(null);
    setStatus(null);
    setDiagnostics(null);
    startTransition(async () => {
      const result = await showTestPomodoroNotification();
      setPermission(result.permission);
      if (result.diagnostics) {
        setDiagnostics(result.diagnostics);
      }
      if (!result.ok) {
        setError(result.error ?? "Could not show a test notification.");
        return;
      }
      setStatus("Notification shown.");
    });
  }

  const notificationsOn =
    preferences.notificationsEnabled && permission === "granted";
  const permissionHint = permissionStatusLabel(permission);

  return (
    <div className={embedded ? "space-y-4" : "ui-card-padded space-y-4"}>
      <div className="space-y-3" id="pomodoro-durations">
        <DurationField
          label="Focus"
          minutes={secondsToMinutes(preferences.focusDurationSeconds)}
          disabled={pending}
          onChange={(minutes) =>
            save({ focusDurationSeconds: minutesToSeconds(minutes) })
          }
        />
        <DurationField
          label="Short break"
          minutes={secondsToMinutes(preferences.shortBreakSeconds)}
          disabled={pending}
          onChange={(minutes) =>
            save({ shortBreakSeconds: minutesToSeconds(minutes) })
          }
        />
        <DurationField
          label="Long break"
          minutes={secondsToMinutes(preferences.longBreakSeconds)}
          disabled={pending}
          onChange={(minutes) =>
            save({ longBreakSeconds: minutesToSeconds(minutes) })
          }
        />
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">Sessions before long break</span>
          <input
            type="number"
            min={1}
            max={12}
            value={preferences.sessionsBeforeLongBreak}
            disabled={pending}
            onChange={(event) =>
              save({ sessionsBeforeLongBreak: Number(event.target.value) })
            }
            className="ui-input w-16 text-center"
          />
        </label>
      </div>

      <div className="space-y-3 border-t border-border-soft pt-4" id="pomodoro-transitions">
        <ToggleRow
          label="Automatically start breaks"
          checked={preferences.autoStartBreaks}
          disabled={pending}
          onChange={(autoStartBreaks) => save({ autoStartBreaks })}
        />
        <ToggleRow
          label="Automatically start focus sessions"
          checked={preferences.autoStartFocus}
          disabled={pending}
          onChange={(autoStartFocus) => save({ autoStartFocus })}
        />
      </div>

      <div className="space-y-3 border-t border-border-soft pt-4" id="pomodoro-completion">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">Notifications</span>
          {notificationsOn ? (
            <button
              type="button"
              className="ui-btn-secondary"
              disabled={pending}
              onClick={disableNotifications}
            >
              Disable
            </button>
          ) : (
            <button
              type="button"
              className="ui-btn-primary"
              disabled={pending || Boolean(supportIssue)}
              onClick={() => {
                void enableNotifications();
              }}
            >
              Enable
            </button>
          )}
        </div>

        {supportIssue ? (
          <p className="text-xs text-muted">{supportIssue}</p>
        ) : permissionHint && !notificationsOn ? (
          <p className="text-xs text-muted">{permissionHint}</p>
        ) : null}

        <ToggleRow
          label="Completion sound"
          checked={preferences.completionSound}
          disabled={pending}
          onChange={(completionSound) => save({ completionSound })}
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">Test notification</span>
          <button
            type="button"
            className="ui-btn-secondary"
            disabled={pending}
            onClick={handleTestNotification}
          >
            Send
          </button>
        </div>
      </div>

      {status ? (
        <p className="text-sm text-muted" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}

      {showDiagnostics && diagnostics ? (
        <pre className="overflow-x-auto rounded-lg border border-border-soft bg-surface-muted p-3 text-[length:var(--density-text-caption)] text-muted">
          {JSON.stringify(
            {
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
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </div>
  );
}
