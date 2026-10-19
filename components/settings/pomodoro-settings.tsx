"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePomodoroPreferencesAction } from "@/app/(app)/pomodoro/actions";
import type { PomodoroPreferences } from "@/lib/pomodoro/constants";
import {
  ensurePomodoroWebPushSubscription,
  getPomodoroNotificationSupportIssue,
  requestPomodoroNotificationPermission,
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
      />
    </label>
  );
}

export function PomodoroSettings({
  preferences: initial,
  embedded = false,
}: PomodoroSettingsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState(initial);
  const [error, setError] = useState<string | null>(null);

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

  async function enableNotifications(next: boolean) {
    if (next) {
      const supportIssue = getPomodoroNotificationSupportIssue();
      if (supportIssue?.includes("Home Screen") || supportIssue?.includes("HTTPS")) {
        setError(supportIssue);
        return;
      }

      const permission = await requestPomodoroNotificationPermission();
      if (permission !== "granted") {
        setError(
          permission === "unsupported"
            ? supportIssue ?? "Notifications are unavailable."
            : "Notification permission was not granted.",
        );
        return;
      }

      const push = await ensurePomodoroWebPushSubscription();
      if (!push.subscribed) {
        setError(
          push.error ??
            "Could not enable background push. Check Settings → Notifications.",
        );
        return;
      }
    }
    save({ notificationsEnabled: next });
  }

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
        <ToggleRow
          label="Quiet completion sound"
          checked={preferences.completionSound}
          disabled={pending}
          onChange={(completionSound) => save({ completionSound })}
        />
        <ToggleRow
          label="Completion notifications"
          checked={preferences.notificationsEnabled}
          disabled={pending}
          onChange={(value) => {
            void enableNotifications(value);
          }}
        />
        <p className="text-xs text-muted">
          Background alerts when possible. Task titles are never included.
        </p>
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}
