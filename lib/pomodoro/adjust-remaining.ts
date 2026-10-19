import { remainingSecondsFromCountdown } from "@/lib/activity-timer/countdown";
import { MAX_POMODORO_DURATION_SECONDS } from "@/lib/pomodoro/constants";

export type AdjustPomodoroRemainingInput = {
  activeElapsedSeconds: number;
  currentTargetDurationSeconds: number;
  /** Absolute remaining seconds (custom). */
  remainingSeconds?: number | null;
  /** Relative delta in seconds (−5 min / +5 min). */
  deltaSeconds?: number | null;
};

export type AdjustPomodoroRemainingResult = {
  targetDurationSeconds: number;
  remainingSeconds: number;
  /** True when remaining was clamped to zero — caller should pause and await Finish. */
  requiresExplicitFinish: boolean;
};

/**
 * Compute a new target duration so remaining time changes while elapsed is preserved.
 * target' = elapsed + remaining'
 */
export function computeAdjustedPomodoroTarget(
  input: AdjustPomodoroRemainingInput,
): AdjustPomodoroRemainingResult {
  const elapsed = Math.max(0, Math.floor(input.activeElapsedSeconds));
  const currentTarget = Math.max(
    0,
    Math.floor(input.currentTargetDurationSeconds),
  );
  const currentRemaining = remainingSecondsFromCountdown(
    currentTarget,
    elapsed,
  );

  const hasAbsolute =
    input.remainingSeconds != null && Number.isFinite(input.remainingSeconds);
  const hasDelta =
    input.deltaSeconds != null && Number.isFinite(input.deltaSeconds);

  if (hasAbsolute === hasDelta) {
    throw new Error("Provide either remainingSeconds or deltaSeconds.");
  }

  let nextRemaining = hasAbsolute
    ? Math.floor(input.remainingSeconds as number)
    : currentRemaining + Math.floor(input.deltaSeconds as number);

  if (!Number.isFinite(nextRemaining)) {
    throw new Error("Invalid remaining duration.");
  }

  nextRemaining = Math.max(0, nextRemaining);

  let target = elapsed + nextRemaining;
  if (target > MAX_POMODORO_DURATION_SECONDS) {
    target = MAX_POMODORO_DURATION_SECONDS;
    nextRemaining = Math.max(0, target - elapsed);
  }

  return {
    targetDurationSeconds: target,
    remainingSeconds: nextRemaining,
    requiresExplicitFinish: nextRemaining === 0,
  };
}
