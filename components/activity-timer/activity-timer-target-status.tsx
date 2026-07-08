"use client";

import {
  formatRemainingTime,
  isActivityTimerTargetReached,
  remainingSecondsFromTarget,
} from "@/lib/activity-timer/format";

type ActivityTimerTargetStatusProps = {
  elapsedSeconds: number;
  targetDurationSeconds: number | null | undefined;
};

export function ActivityTimerTargetStatus({
  elapsedSeconds,
  targetDurationSeconds,
}: ActivityTimerTargetStatusProps) {
  if (targetDurationSeconds == null || targetDurationSeconds <= 0) {
    return null;
  }

  if (isActivityTimerTargetReached(elapsedSeconds, targetDurationSeconds)) {
    return (
      <p className="text-sm font-medium text-muted" aria-live="polite">
        Target reached
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
