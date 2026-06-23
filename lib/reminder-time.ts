const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_MORNING_REMINDER_TIME = "09:00";
export const DEFAULT_EVENING_REMINDER_TIME = "21:00";

export function isValidReminderTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function normalizeReminderTimeForInput(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed || !isValidReminderTime(trimmed)) {
    const looseMatch = trimmed?.match(/^(\d{1,2}):(\d{2})/);
    if (looseMatch) {
      const hours = Number(looseMatch[1]);
      const minutes = Number(looseMatch[2]);
      if (
        Number.isFinite(hours) &&
        Number.isFinite(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      ) {
        const normalized = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        return isValidReminderTime(normalized) ? normalized : fallback;
      }
    }

    return fallback;
  }

  return trimmed;
}
