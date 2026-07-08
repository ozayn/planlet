"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useOptionalActivityTimer } from "@/components/activity-timer/activity-timer-context";
import {
  elapsedSecondsFromStartedAt,
  formatActivityClock,
} from "@/lib/activity-timer/format";

export function ActivityTimerFloatingPill() {
  const pathname = usePathname();
  const context = useOptionalActivityTimer();
  const activeSession = context?.activeSession ?? null;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const tick = () => setNowMs(Date.now());
    const interval = window.setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeSession]);

  if (!activeSession || pathname === "/timer" || pathname.startsWith("/timer/")) {
    return null;
  }

  const elapsed = formatActivityClock(
    elapsedSecondsFromStartedAt(activeSession.startedAt, nowMs),
  );

  return (
    <Link
      href="/timer"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-1/2 z-40 flex max-w-[min(92vw,20rem)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-border-soft bg-surface/95 px-4 py-2.5 shadow-md backdrop-blur-sm transition-colors hover:bg-accent-cream/25 md:bottom-6"
      aria-label={`Return to timer: ${activeSession.title}, ${elapsed} elapsed`}
    >
      <span
        className="size-2 shrink-0 rounded-full bg-muted"
        aria-hidden="true"
      />
      <span className="font-mono text-sm font-medium text-foreground">
        {elapsed}
      </span>
      <span className="truncate text-sm text-muted">{activeSession.title}</span>
    </Link>
  );
}
