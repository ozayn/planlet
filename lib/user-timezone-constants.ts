import { APP_TIMEZONE } from "@/config/time";

export const FALLBACK_TIMEZONE = APP_TIMEZONE;

export const SETTINGS_TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tehran",
] as const;

export type SettingsTimezoneOption = (typeof SETTINGS_TIMEZONE_OPTIONS)[number];

export function isValidTimezone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(input: string): string {
  const trimmed = input.trim();
  if (!isValidTimezone(trimmed)) {
    throw new Error("Invalid timezone.");
  }

  return trimmed;
}
