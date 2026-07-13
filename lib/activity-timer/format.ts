export function elapsedSecondsFromStartedAt(
  startedAt: string | Date,
  nowMs = Date.now(),
): number {
  const startedMs = new Date(startedAt).getTime();

  if (!Number.isFinite(startedMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
}

export function durationSecondsBetween(
  startedAt: string | Date,
  stoppedAt: string | Date,
): number {
  const startedMs = new Date(startedAt).getTime();
  const stoppedMs = new Date(stoppedAt).getTime();

  if (!Number.isFinite(startedMs) || !Number.isFinite(stoppedMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((stoppedMs - startedMs) / 1000));
}

export function formatActivityDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
  }

  return `${remainingSeconds}s`;
}

export function formatActivityClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatActivityDurationShort(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;

  if (minutes > 0 && remainingSeconds === 0) {
    return `${minutes} min`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
  }

  return `${remainingSeconds} sec`;
}

export function formatActivityTotalMinutes(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));

  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function formatSessionClockTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatSessionTimeRange(
  startedAt: Date,
  stoppedAt: Date,
  timezone: string,
): string {
  const startLabel = formatSessionClockTime(startedAt, timezone);
  const endLabel = formatSessionClockTime(stoppedAt, timezone);

  return `${startLabel}–${endLabel}`;
}

export function formatTargetDurationLabel(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.round(safe / 60);

  return minutes === 1 ? "1 min" : `${minutes} min`;
}

export function formatCountdownPresetDurationLabel(seconds: number): string {
  return formatActivityDurationShort(seconds);
}

export function remainingSecondsFromTarget(
  elapsedSeconds: number,
  targetDurationSeconds: number,
): number {
  return Math.max(0, Math.floor(targetDurationSeconds - elapsedSeconds));
}

export function isActivityTimerTargetReached(
  elapsedSeconds: number,
  targetDurationSeconds: number | null | undefined,
): boolean {
  return (
    targetDurationSeconds != null &&
    targetDurationSeconds > 0 &&
    elapsedSeconds >= targetDurationSeconds
  );
}

export function formatRemainingTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} left`;
}

export function truncateActivityNotesPreview(
  notes: string | null | undefined,
  maxLength = 72,
): string | null {
  const trimmed = notes?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}
