"use client";

import { useId } from "react";

import { useWallClockElapsed } from "@/components/activity-timer/use-wall-clock-elapsed";
import type { ActivityTimerTargetDuration } from "@/lib/activity-timer/constants";
import { formatActivityClock } from "@/lib/activity-timer/format";

type ActivityTimerRingProps = {
  startedAt?: string | null;
  running?: boolean;
  /** When set, the ring shows completion progress instead of the elapsed animation. */
  targetDurationSeconds?: ActivityTimerTargetDuration;
  className?: string;
};

const RING_SIZE = 248;
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ActivityTimerRing({
  startedAt = null,
  running = false,
  targetDurationSeconds = null,
  className = "",
}: ActivityTimerRingProps) {
  const gradientId = useId();
  const elapsedSeconds = useWallClockElapsed(startedAt, running);
  const hasTarget =
    targetDurationSeconds != null && targetDurationSeconds > 0;
  const progress = hasTarget
    ? Math.min(1, elapsedSeconds / targetDurationSeconds)
    : 0;
  const progressOffset = CIRCUMFERENCE * (1 - progress);
  const elapsedLabel = formatActivityClock(elapsedSeconds);

  return (
    <div
      className={`relative mx-auto flex items-center justify-center ${className}`}
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--muted-light)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--muted)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={STROKE_WIDTH}
          className="opacity-80"
        />

        {hasTarget ? (
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={progressOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        ) : (
          <g
            className="origin-center animate-[activity-timer-ring-spin_18s_linear_infinite]"
            style={{ transformOrigin: `${RING_SIZE / 2}px ${RING_SIZE / 2}px` }}
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.18} ${CIRCUMFERENCE * 0.82}`}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              className={running ? "opacity-90" : "opacity-45"}
            />
          </g>
        )}
      </svg>

      <p
        className="absolute inset-0 flex items-center justify-center font-mono text-5xl font-semibold tracking-tight text-foreground sm:text-[3.25rem]"
        aria-live="polite"
        aria-atomic="true"
      >
        {elapsedLabel}
      </p>
    </div>
  );
}
