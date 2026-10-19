import { formatActivityDuration } from "@/lib/activity-timer/format";
import type { PomodoroDailySummary } from "@/lib/pomodoro/constants";

export function formatPomodoroFocusedSummary(
  summary: PomodoroDailySummary,
): string {
  if (summary.sessionCount === 0) {
    return "No sessions yet";
  }

  const sessionsLabel =
    summary.sessionCount === 1
      ? "1 session"
      : `${summary.sessionCount} sessions`;

  return `${sessionsLabel} · ${formatActivityDuration(summary.focusedSeconds)} focused`;
}
