"use client";

import { useEffect, useState } from "react";

import type { ActivityTimerMode } from "@/lib/activity-timer/constants";
import {
  activeElapsedSecondsFromSession,
  displaySecondsForTimerMode,
  isCountdownComplete,
  remainingSecondsFromCountdown,
} from "@/lib/activity-timer/countdown";

type ActivityTimerClockSession = {
  startedAt: string;
  pausedAt?: string | null;
  accumulatedPausedSeconds?: number;
  timerMode?: ActivityTimerMode;
  targetDurationSeconds?: number | null;
};

export type ActivityTimerClockState = {
  activeElapsedSeconds: number;
  displaySeconds: number;
  remainingSeconds: number | null;
  isPaused: boolean;
  isCountdown: boolean;
  isComplete: boolean;
};

/**
 * Wall-clock timer state derived from persisted session timestamps.
 * setInterval only nudges re-renders; timestamp math is the source of truth.
 */
export function useActivityTimerClock(
  session: ActivityTimerClockSession | null | undefined,
  enabled = true,
): ActivityTimerClockState {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !session?.startedAt) {
      return;
    }

    const syncNow = () => setNowMs(Date.now());
    const interval = window.setInterval(syncNow, 250);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", syncNow);
    window.addEventListener("focus", syncNow);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", syncNow);
      window.removeEventListener("focus", syncNow);
    };
  }, [enabled, session?.startedAt, session?.pausedAt]);

  if (!session?.startedAt) {
    return {
      activeElapsedSeconds: 0,
      displaySeconds: 0,
      remainingSeconds: null,
      isPaused: false,
      isCountdown: false,
      isComplete: false,
    };
  }

  const timerMode = session.timerMode ?? "countUp";
  const isPaused = Boolean(session.pausedAt);
  const activeElapsedSeconds = activeElapsedSecondsFromSession({
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    accumulatedPausedSeconds: session.accumulatedPausedSeconds,
    nowMs,
  });
  const isCountdown =
    timerMode === "countDown" &&
    session.targetDurationSeconds != null &&
    session.targetDurationSeconds > 0;
  const displaySeconds = displaySecondsForTimerMode(
    timerMode,
    activeElapsedSeconds,
    session.targetDurationSeconds,
  );
  const remainingSeconds =
    isCountdown && session.targetDurationSeconds != null
      ? remainingSecondsFromCountdown(
          session.targetDurationSeconds,
          activeElapsedSeconds,
        )
      : null;
  const isComplete = isCountdownComplete(
    timerMode,
    session.targetDurationSeconds,
    activeElapsedSeconds,
  );

  return {
    activeElapsedSeconds,
    displaySeconds,
    remainingSeconds,
    isPaused,
    isCountdown,
    isComplete,
  };
}
