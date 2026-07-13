import type { ActivityTimerMode } from "@/lib/activity-timer/constants";

export type ActivityTimerClockInput = {
  startedAt: string | Date;
  pausedAt?: string | Date | null;
  accumulatedPausedSeconds?: number;
  nowMs?: number;
};

export function activeElapsedSecondsFromSession(
  input: ActivityTimerClockInput,
): number {
  const startedMs = new Date(input.startedAt).getTime();
  const nowMs = input.nowMs ?? Date.now();

  if (!Number.isFinite(startedMs)) {
    return 0;
  }

  const totalWallSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  const accumulatedPaused = Math.max(
    0,
    Math.floor(input.accumulatedPausedSeconds ?? 0),
  );

  let currentPauseSeconds = 0;

  if (input.pausedAt) {
    const pausedMs = new Date(input.pausedAt).getTime();

    if (Number.isFinite(pausedMs)) {
      currentPauseSeconds = Math.max(0, Math.floor((nowMs - pausedMs) / 1000));
    }
  }

  return Math.max(0, totalWallSeconds - accumulatedPaused - currentPauseSeconds);
}

export function remainingSecondsFromCountdown(
  targetDurationSeconds: number,
  activeElapsedSeconds: number,
): number {
  return Math.max(
    0,
    Math.floor(targetDurationSeconds - activeElapsedSeconds),
  );
}

export function isCountdownComplete(
  timerMode: ActivityTimerMode,
  targetDurationSeconds: number | null | undefined,
  activeElapsedSeconds: number,
): boolean {
  return (
    timerMode === "countDown" &&
    targetDurationSeconds != null &&
    targetDurationSeconds > 0 &&
    activeElapsedSeconds >= targetDurationSeconds
  );
}

export function displaySecondsForTimerMode(
  timerMode: ActivityTimerMode,
  activeElapsedSeconds: number,
  targetDurationSeconds: number | null | undefined,
): number {
  if (
    timerMode === "countDown" &&
    targetDurationSeconds != null &&
    targetDurationSeconds > 0
  ) {
    return remainingSecondsFromCountdown(
      targetDurationSeconds,
      activeElapsedSeconds,
    );
  }

  return activeElapsedSeconds;
}

export function countdownProgressRatio(
  targetDurationSeconds: number,
  activeElapsedSeconds: number,
): number {
  if (targetDurationSeconds <= 0) {
    return 0;
  }

  return Math.min(1, activeElapsedSeconds / targetDurationSeconds);
}
