"use client";

import { useId } from "react";

import { useActivityTimerClock } from "@/components/activity-timer/use-activity-timer-clock";
import type {
  ActivityTimerMode,
  ActivityTimerTargetDuration,
} from "@/lib/activity-timer/constants";
import { countdownProgressRatio } from "@/lib/activity-timer/countdown";
import { formatActivityClock } from "@/lib/activity-timer/format";

type ActivityTimerRingProps = {
  startedAt?: string | null;
  running?: boolean;
  timerMode?: ActivityTimerMode;
  targetDurationSeconds?: ActivityTimerTargetDuration;
  pausedAt?: string | null;
  accumulatedPausedSeconds?: number;
  /** Static display when armed but not yet started (countdown presets). */
  previewSeconds?: number | null;
  className?: string;
};

/** Fixed SVG coordinate space; the ring scales via responsive container width. */
const VIEWBOX_SIZE = 248;
const STROKE_WIDTH = 3;
const RADIUS = (VIEWBOX_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = VIEWBOX_SIZE / 2;

export function ActivityTimerRing({
  startedAt = null,
  running = false,
  timerMode = "countUp",
  targetDurationSeconds = null,
  pausedAt = null,
  accumulatedPausedSeconds = 0,
  previewSeconds = null,
  className = "",
}: ActivityTimerRingProps) {
  const gradientId = useId();
  const clock = useActivityTimerClock(
    running && startedAt
      ? {
          startedAt,
          pausedAt,
          accumulatedPausedSeconds,
          timerMode,
          targetDurationSeconds,
        }
      : null,
    running && Boolean(startedAt),
  );
  const isCountdown =
    timerMode === "countDown" &&
    targetDurationSeconds != null &&
    targetDurationSeconds > 0;
  const hasTarget =
    targetDurationSeconds != null && targetDurationSeconds > 0;
  const displaySeconds =
    previewSeconds != null
      ? previewSeconds
      : isCountdown
        ? clock.displaySeconds
        : clock.activeElapsedSeconds;
  const progress = isCountdown
    ? countdownProgressRatio(
        targetDurationSeconds!,
        clock.activeElapsedSeconds,
      )
    : hasTarget
      ? Math.min(1, clock.activeElapsedSeconds / targetDurationSeconds!)
      : 0;
  const progressOffset = CIRCUMFERENCE * (1 - progress);
  const displayLabel = formatActivityClock(displaySeconds);

  return (
    <div
      className={`ui-activity-timer-ring relative mx-auto aspect-square ${className}`}
    >
      <svg
        className="block h-full w-full"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--muted-light)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--muted)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={STROKE_WIDTH}
          className="opacity-80"
        />

        {hasTarget && (running || previewSeconds != null) ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={previewSeconds != null ? CIRCUMFERENCE : progressOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        ) : (
          <g className="origin-center animate-[activity-timer-ring-spin_18s_linear_infinite]">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.18} ${CIRCUMFERENCE * 0.82}`}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              className={running ? "opacity-90" : "opacity-45"}
            />
          </g>
        )}
      </svg>

      <p
        className="ui-activity-timer-clock absolute inset-0 flex items-center justify-center font-mono font-semibold leading-none tracking-tight text-foreground"
        aria-live="polite"
        aria-atomic="true"
      >
        {displayLabel}
      </p>
    </div>
  );
}
