"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateUserTimezoneAction } from "@/app/(app)/settings/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  SETTINGS_TIMEZONE_OPTIONS,
  type SettingsTimezoneOption,
} from "@/lib/user-timezone-constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type SettingsTimezoneProps = {
  timezone: string;
};

function getBrowserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function SettingsTimezone({ timezone }: SettingsTimezoneProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(timezone);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDetectedTimezone(getBrowserTimezone());
  }, []);

  useEffect(() => {
    setSelected(timezone);
  }, [timezone]);

  function handleChange(nextTimezone: string) {
    if (nextTimezone === selected || isPending) {
      return;
    }

    setError(null);
    setSelected(nextTimezone);

    startTransition(async () => {
      const result = await updateUserTimezoneAction(nextTimezone);

      if (!result.success) {
        setSelected(timezone);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const options = SETTINGS_TIMEZONE_OPTIONS.includes(
    selected as SettingsTimezoneOption,
  )
    ? SETTINGS_TIMEZONE_OPTIONS
    : ([selected, ...SETTINGS_TIMEZONE_OPTIONS] as const);

  return (
    <SettingsSection title="Timezone">
      <label
        htmlFor="settings-timezone"
        className="flex min-h-10 flex-col gap-1.5 text-sm text-foreground"
      >
        <span className="font-medium">Your timezone</span>
        <select
          id="settings-timezone"
          name="timezone"
          value={selected}
          disabled={isPending}
          onChange={(event) => handleChange(event.target.value)}
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
      {detectedTimezone ? (
        <p className="text-xs text-muted-light">
          Detected: {detectedTimezone}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </SettingsSection>
  );
}
