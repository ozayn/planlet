"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateNotificationPreferencesAction } from "@/app/(app)/settings/actions";
import type { SerializedNotificationPreferences } from "@/lib/notification-preferences";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ReminderSettingsProps = {
  preferences: SerializedNotificationPreferences;
  pushSubscribed: boolean;
};

function formatReminderTimeLabel(value: string): string {
  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function ReminderSettings({
  preferences,
  pushSubscribed,
}: ReminderSettingsProps) {
  const router = useRouter();
  const [morningEnabled, setMorningEnabled] = useState(
    preferences.morningEnabled,
  );
  const [morningTime, setMorningTime] = useState(preferences.morningTime);
  const [eveningEnabled, setEveningEnabled] = useState(
    preferences.eveningEnabled,
  );
  const [eveningTime, setEveningTime] = useState(preferences.eveningTime);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  function savePreferences(next: {
    morningEnabled?: boolean;
    morningTime?: string;
    eveningEnabled?: boolean;
    eveningTime?: string;
  }) {
    const payload = {
      morningEnabled: next.morningEnabled ?? morningEnabled,
      morningTime: next.morningTime ?? morningTime,
      eveningEnabled: next.eveningEnabled ?? eveningEnabled,
      eveningTime: next.eveningTime ?? eveningTime,
      timezone: preferences.timezone,
    };

    setError(null);

    startSave(async () => {
      const result = await updateNotificationPreferencesAction(payload);

      if (!result.success) {
        setMorningEnabled(preferences.morningEnabled);
        setMorningTime(preferences.morningTime);
        setEveningEnabled(preferences.eveningEnabled);
        setEveningTime(preferences.eveningTime);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleMorningToggle(enabled: boolean) {
    setMorningEnabled(enabled);
    savePreferences({ morningEnabled: enabled });
  }

  function handleEveningToggle(enabled: boolean) {
    setEveningEnabled(enabled);
    savePreferences({ eveningEnabled: enabled });
  }

  function handleMorningTimeChange(value: string) {
    setMorningTime(value);
    savePreferences({ morningTime: value });
  }

  function handleEveningTimeChange(value: string) {
    setEveningTime(value);
    savePreferences({ eveningTime: value });
  }

  return (
    <div className="ui-settings-row-block">
      <p className="ui-settings-subsection-title">Daily reminders</p>
      <p className="ui-settings-subsection-helper">
        Optional push reminders for planning and evening review.
        {!pushSubscribed ? (
          <> Enable phone notifications to receive reminders.</>
        ) : null}
      </p>

      <div className="space-y-3">
        <div className="flex min-h-10 items-center justify-between gap-3 text-sm text-foreground">
          <span>Morning reminder</span>
          <span className="flex items-center gap-2">
            <input
              id="reminder-morning-enabled"
              name="reminder-morning-enabled"
              type="checkbox"
              disabled={isSaving}
              onChange={(event) => handleMorningToggle(event.target.checked)}
              className="h-4 w-4 rounded border-border-soft"
              aria-label="Enable morning reminder"
            />
            <input
              id="reminder-morning-time"
              name="reminder-morning-time"
              type="time"
              disabled={!morningEnabled || isSaving}
              onChange={(event) => handleMorningTimeChange(event.target.value)}
              {...passwordManagerSafeControlProps}
              className="ui-input min-h-9 w-[7.5rem] px-2 text-sm"
              aria-label="Morning reminder time"
            />
          </span>
        </div>

        <div className="flex min-h-10 items-center justify-between gap-3 text-sm text-foreground">
          <span>Evening reminder</span>
          <span className="flex items-center gap-2">
            <input
              id="reminder-evening-enabled"
              name="reminder-evening-enabled"
              type="checkbox"
              disabled={isSaving}
              onChange={(event) => handleEveningToggle(event.target.checked)}
              className="h-4 w-4 rounded border-border-soft"
              aria-label="Enable evening reminder"
            />
            <input
              id="reminder-evening-time"
              name="reminder-evening-time"
              type="time"
              disabled={!eveningEnabled || isSaving}
              onChange={(event) => handleEveningTimeChange(event.target.value)}
              {...passwordManagerSafeControlProps}
              className="ui-input min-h-9 w-[7.5rem] px-2 text-sm"
              aria-label="Evening reminder time"
            />
          </span>
        </div>

        <p className="ui-settings-subsection-status">
          Morning: {formatReminderTimeLabel(morningTime)} · Evening:{" "}
          {formatReminderTimeLabel(eveningTime)}
        </p>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
