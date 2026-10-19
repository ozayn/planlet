import {
  DEFAULT_POMODORO_PREFERENCES,
  MAX_POMODORO_DURATION_SECONDS,
  MAX_POMODORO_SESSIONS_BEFORE_LONG_BREAK,
  MIN_POMODORO_DURATION_SECONDS,
  MIN_POMODORO_SESSIONS_BEFORE_LONG_BREAK,
  type PomodoroPreferences,
} from "@/lib/pomodoro/constants";

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizePomodoroPreferences(
  input: Partial<PomodoroPreferences> | null | undefined,
): PomodoroPreferences {
  const base = DEFAULT_POMODORO_PREFERENCES;

  return {
    focusDurationSeconds: clampInt(
      input?.focusDurationSeconds,
      MIN_POMODORO_DURATION_SECONDS,
      MAX_POMODORO_DURATION_SECONDS,
      base.focusDurationSeconds,
    ),
    shortBreakSeconds: clampInt(
      input?.shortBreakSeconds,
      MIN_POMODORO_DURATION_SECONDS,
      MAX_POMODORO_DURATION_SECONDS,
      base.shortBreakSeconds,
    ),
    longBreakSeconds: clampInt(
      input?.longBreakSeconds,
      MIN_POMODORO_DURATION_SECONDS,
      MAX_POMODORO_DURATION_SECONDS,
      base.longBreakSeconds,
    ),
    sessionsBeforeLongBreak: clampInt(
      input?.sessionsBeforeLongBreak,
      MIN_POMODORO_SESSIONS_BEFORE_LONG_BREAK,
      MAX_POMODORO_SESSIONS_BEFORE_LONG_BREAK,
      base.sessionsBeforeLongBreak,
    ),
    autoStartBreaks: Boolean(input?.autoStartBreaks ?? base.autoStartBreaks),
    autoStartFocus: Boolean(input?.autoStartFocus ?? base.autoStartFocus),
    completionSound: Boolean(input?.completionSound ?? base.completionSound),
    notificationsEnabled: Boolean(
      input?.notificationsEnabled ?? base.notificationsEnabled,
    ),
  };
}

export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60);
}

export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}
