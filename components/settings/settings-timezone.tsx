"use client";

import type { TimezoneMode } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  updateUserTimezoneAction,
  updateUserTimezoneModeAction,
} from "@/app/(app)/settings/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  SETTINGS_TIMEZONE_OPTIONS,
  TIMEZONE_MODE_OPTIONS,
  type SettingsTimezoneOption,
} from "@/lib/user-timezone-constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type SettingsTimezoneProps = {
  timezone: string;
  timezoneMode: TimezoneMode;
};

function getBrowserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function SettingsTimezone({
  timezone,
  timezoneMode,
}: SettingsTimezoneProps) {
  const router = useRouter();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [selectedMode, setSelectedMode] = useState(timezoneMode);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAutomatic = selectedMode === "AUTOMATIC";

  useEffect(() => {
    setDetectedTimezone(getBrowserTimezone());
  }, []);

  useEffect(() => {
    setSelectedTimezone(timezone);
    setSelectedMode(timezoneMode);
  }, [timezone, timezoneMode]);

  function handleTimezoneChange(nextTimezone: string) {
    if (nextTimezone === selectedTimezone || isPending || isAutomatic) {
      return;
    }

    setError(null);
    setSelectedTimezone(nextTimezone);

    startTransition(async () => {
      const result = await updateUserTimezoneAction(nextTimezone);

      if (!result.success) {
        setSelectedTimezone(timezone);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleModeChange(nextMode: TimezoneMode) {
    if (nextMode === selectedMode || isPending) {
      return;
    }

    setError(null);
    setSelectedMode(nextMode);

    startTransition(async () => {
      const browserTimezone = getBrowserTimezone();
      const result = await updateUserTimezoneModeAction(
        nextMode,
        nextMode === "AUTOMATIC" ? (browserTimezone ?? undefined) : undefined,
      );

      if (!result.success) {
        setSelectedMode(timezoneMode);
        setError(result.error);
        return;
      }

      if (nextMode === "AUTOMATIC" && browserTimezone) {
        setSelectedTimezone(browserTimezone);
      }

      router.refresh();
    });
  }

  const options = SETTINGS_TIMEZONE_OPTIONS.includes(
    selectedTimezone as SettingsTimezoneOption,
  )
    ? SETTINGS_TIMEZONE_OPTIONS
    : ([selectedTimezone, ...SETTINGS_TIMEZONE_OPTIONS] as const);

  return (
    <SettingsSection title="Timezone">
      <fieldset className="ui-settings-fieldset">
        <legend className="sr-only">Timezone mode</legend>
        <p className="text-sm font-medium text-foreground">Timezone mode</p>

        <div className="flex flex-wrap gap-1.5">
          {TIMEZONE_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm transition-colors ${
                selectedMode === option.value ? "ui-segment-active" : "ui-segment"
              }`}
            >
              <input
                id={`timezone-mode-${option.value}`}
                type="radio"
                name="timezone-mode"
                value={option.value}
                checked={selectedMode === option.value}
                disabled={isPending}
                onChange={() => handleModeChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>

        <p className="text-xs text-muted-light">
          {
            TIMEZONE_MODE_OPTIONS.find((option) => option.value === selectedMode)
              ?.description
          }
        </p>
      </fieldset>

      {isAutomatic ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Current timezone</p>
          <p className="text-sm text-foreground">{selectedTimezone}</p>
          {detectedTimezone && detectedTimezone !== selectedTimezone ? (
            <p className="text-xs text-muted-light">
              Browser detected: {detectedTimezone}. It will sync on your next visit.
            </p>
          ) : detectedTimezone ? (
            <p className="text-xs text-muted-light">
              Detected: {detectedTimezone}
            </p>
          ) : null}
        </div>
      ) : (
        <label
          htmlFor="settings-timezone"
          className="flex min-h-10 flex-col gap-1.5 text-sm text-foreground"
        >
          <span className="font-medium">Your timezone</span>
          <select
            id="settings-timezone"
            name="timezone"
            value={selectedTimezone}
            disabled={isPending}
            onChange={(event) => handleTimezoneChange(event.target.value)}
            className="ui-input min-h-10 w-full px-3 text-sm"
            {...passwordManagerSafeControlProps}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </SettingsSection>
  );
}
