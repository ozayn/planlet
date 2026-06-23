"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateNotificationPreferencesAction } from "@/app/(app)/settings/actions";
import type { SerializedNotificationPreferences } from "@/lib/notification-preferences";
import {
  DEFAULT_EVENING_REMINDER_TIME,
  DEFAULT_MORNING_REMINDER_TIME,
  normalizeReminderTimeForInput,
} from "@/lib/reminder-time";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ReminderSettingsProps = {
  preferences: SerializedNotificationPreferences;
  pushSubscribed: boolean;
};

export function ReminderSettings({
  preferences,
  pushSubscribed,
}: ReminderSettingsProps) {
  const router = useRouter();
  const [morningEnabled, setMorningEnabled] = useState(
    preferences.morningEnabled,
  );
  const [morningTime, setMorningTime] = useState(() =>
    normalizeReminderTimeForInput(
      preferences.morningTime,
      DEFAULT_MORNING_REMINDER_TIME,
    ),
  );
  const [eveningEnabled, setEveningEnabled] = useState(
    preferences.eveningEnabled,
  );
  const [eveningTime, setEveningTime] = useState(() =>
    normalizeReminderTimeForInput(
      preferences.eveningTime,
      DEFAULT_EVENING_REMINDER_TIME,
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    setMorningEnabled(preferences.morningEnabled);
    setMorningTime(
      normalizeReminderTimeForInput(
        preferences.morningTime,
        DEFAULT_MORNING_REMINDER_TIME,
      ),
    );
    setEveningEnabled(preferences.eveningEnabled);
    setEveningTime(
      normalizeReminderTimeForInput(
        preferences.eveningTime,
        DEFAULT_EVENING_REMINDER_TIME,
      ),
    );
  }, [preferences]);

  function savePreferences(next: {
    morningEnabled?: boolean;
    morningTime?: string;
    eveningEnabled?: boolean;
    eveningTime?: string;
  }) {
    const payload = {
      morningEnabled: next.morningEnabled ?? morningEnabled,
      morningTime: normalizeReminderTimeForInput(
        next.morningTime ?? morningTime,
        DEFAULT_MORNING_REMINDER_TIME,
      ),
      eveningEnabled: next.eveningEnabled ?? eveningEnabled,
      eveningTime: normalizeReminderTimeForInput(
        next.eveningTime ?? eveningTime,
        DEFAULT_EVENING_REMINDER_TIME,
      ),
      timezone: preferences.timezone,
    };

    setError(null);

    startSave(async () => {
      const result = await updateNotificationPreferencesAction(payload);

      if (!result.success) {
        setMorningEnabled(preferences.morningEnabled);
        setMorningTime(
          normalizeReminderTimeForInput(
            preferences.morningTime,
            DEFAULT_MORNING_REMINDER_TIME,
          ),
        );
        setEveningEnabled(preferences.eveningEnabled);
        setEveningTime(
          normalizeReminderTimeForInput(
            preferences.eveningTime,
            DEFAULT_EVENING_REMINDER_TIME,
          ),
        );
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
    const normalized = normalizeReminderTimeForInput(
      value,
      DEFAULT_MORNING_REMINDER_TIME,
    );
    setMorningTime(normalized);
    savePreferences({ morningTime: normalized });
  }

  function handleEveningTimeChange(value: string) {
    const normalized = normalizeReminderTimeForInput(
      value,
      DEFAULT_EVENING_REMINDER_TIME,
    );
    setEveningTime(normalized);
    savePreferences({ eveningTime: normalized });
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
              checked={morningEnabled}
              disabled={isSaving}
              onChange={(event) => handleMorningToggle(event.target.checked)}
              className="h-4 w-4 rounded border-border-soft"
              aria-label="Enable morning reminder"
            />
            <input
              id="reminder-morning-time"
              name="reminder-morning-time"
              type="time"
              value={morningTime}
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
              checked={eveningEnabled}
              disabled={isSaving}
              onChange={(event) => handleEveningToggle(event.target.checked)}
              className="h-4 w-4 rounded border-border-soft"
              aria-label="Enable evening reminder"
            />
            <input
              id="reminder-evening-time"
              name="reminder-evening-time"
              type="time"
              value={eveningTime}
              disabled={!eveningEnabled || isSaving}
              onChange={(event) => handleEveningTimeChange(event.target.value)}
              {...passwordManagerSafeControlProps}
              className="ui-input min-h-9 w-[7.5rem] px-2 text-sm"
              aria-label="Evening reminder time"
            />
          </span>
        </div>

        <p className="ui-settings-subsection-status">
          Morning: {morningTime} · Evening: {eveningTime}
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
