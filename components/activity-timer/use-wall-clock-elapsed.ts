"use client";

import { useEffect, useState } from "react";

import { elapsedSecondsFromStartedAt } from "@/lib/activity-timer/format";

/**
 * Elapsed seconds derived from a persisted startedAt timestamp.
 * setInterval only nudges re-renders; Date.now() - startedAt is the source of truth.
 */
export function useWallClockElapsed(
  startedAt: string | null | undefined,
  enabled = true,
): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !startedAt) {
      return;
    }

    const syncNow = () => setNowMs(Date.now());
    const interval = window.setInterval(syncNow, 1000);

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
  }, [enabled, startedAt]);

  if (!startedAt) {
    return 0;
  }

  return elapsedSecondsFromStartedAt(startedAt, nowMs);
}
