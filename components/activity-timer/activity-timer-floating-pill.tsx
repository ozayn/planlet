"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useOptionalActivityTimer } from "@/components/activity-timer/activity-timer-context";
import { useActivityTimerClock } from "@/components/activity-timer/use-activity-timer-clock";
import { formatActivityClock } from "@/lib/activity-timer/format";

export function ActivityTimerFloatingPill() {
  const pathname = usePathname();
  const context = useOptionalActivityTimer();
  const activeSession = context?.activeSession ?? null;
  const clock = useActivityTimerClock(activeSession, Boolean(activeSession));

  if (!activeSession || pathname === "/timer" || pathname.startsWith("/timer/")) {
    return null;
  }

  const clockLabel = formatActivityClock(clock.displaySeconds);
  const statusLabel = clock.isPaused ? "paused" : "elapsed";

  return (
    <Link
      href="/timer"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-1/2 z-40 flex max-w-[min(92vw,20rem)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-border-soft bg-surface/95 px-4 py-2.5 shadow-md backdrop-blur-sm transition-colors hover:bg-accent-cream/25 md:bottom-6"
      aria-label={`Return to timer: ${activeSession.title}, ${clockLabel} ${statusLabel}`}
    >
      <span
        className={`size-2 shrink-0 rounded-full ${
          clock.isPaused ? "bg-muted-light" : "bg-muted"
        }`}
        aria-hidden="true"
      />
      <span className="font-mono text-sm font-medium text-foreground">
        {clockLabel}
      </span>
      <span className="truncate text-sm text-muted">{activeSession.title}</span>
    </Link>
  );
}
