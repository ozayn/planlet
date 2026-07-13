"use client";

import {
  formatRemainingTime,
  isActivityTimerTargetReached,
  remainingSecondsFromTarget,
} from "@/lib/activity-timer/format";
import type { ActivityTimerMode } from "@/lib/activity-timer/constants";

type ActivityTimerTargetStatusProps = {
  timerMode: ActivityTimerMode;
  elapsedSeconds: number;
  targetDurationSeconds: number | null | undefined;
  isComplete?: boolean;
  isPaused?: boolean;
};

export function ActivityTimerTargetStatus({
  timerMode,
  elapsedSeconds,
  targetDurationSeconds,
  isComplete = false,
  isPaused = false,
}: ActivityTimerTargetStatusProps) {
  if (timerMode === "countDown") {
    if (isComplete) {
      return (
        <p className="text-sm font-medium text-muted" aria-live="polite">
          Complete
        </p>
      );
    }

    if (isPaused) {
      return (
        <p className="text-sm text-muted-light" aria-live="polite">
          Paused
        </p>
      );
    }

    return null;
  }

  if (targetDurationSeconds == null || targetDurationSeconds <= 0) {
    return isPaused ? (
      <p className="text-sm text-muted-light" aria-live="polite">
        Paused
      </p>
    ) : null;
  }

  if (isActivityTimerTargetReached(elapsedSeconds, targetDurationSeconds)) {
    return (
      <p className="text-sm font-medium text-muted" aria-live="polite">
        Target reached
      </p>
    );
  }

  if (isPaused) {
    return (
      <p className="text-sm text-muted-light" aria-live="polite">
        Paused
      </p>
    );
  }

  const remainingSeconds = remainingSecondsFromTarget(
    elapsedSeconds,
    targetDurationSeconds,
  );

  return (
    <p className="text-sm text-muted-light" aria-live="polite">
      {formatRemainingTime(remainingSeconds)}
    </p>
  );
}
