"use client";

import { ActivityTimerSessionDeleteButton } from "@/components/activity-timer/activity-timer-session-delete-button";
import type { ActivityTimerInsights } from "@/lib/activity-timer/constants";

type ActivityTimerTimelineProps = {
  insights: ActivityTimerInsights;
  disabled?: boolean;
  onDelete: (sessionId: string) => void;
};

export function ActivityTimerTimeline({
  insights,
  disabled = false,
  onDelete,
}: ActivityTimerTimelineProps) {
  const { todayTimeline, todayTotalMinutesLabel } = insights;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Today</h2>

      {todayTimeline.length === 0 ? (
        <p className="text-sm text-muted">No timed activities yet today.</p>
      ) : (
        <ol className="space-y-3">
          {todayTimeline.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-1 rounded-2xl border border-border-soft bg-surface px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-light">{entry.timeRangeLabel}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {entry.title}
                </p>
              </div>
              <ActivityTimerSessionDeleteButton
                disabled={disabled}
                onClick={() => onDelete(entry.id)}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-border-soft pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
          Today&apos;s total
        </p>
        <p className="mt-1 text-lg font-medium text-foreground">
          {todayTotalMinutesLabel}
        </p>
      </div>
    </section>
  );
}
