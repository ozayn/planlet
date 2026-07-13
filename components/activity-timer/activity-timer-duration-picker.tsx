"use client";

import {
  QUICK_COUNTDOWN_DURATION_OPTIONS,
  QUICK_TARGET_DURATION_OPTIONS,
} from "@/lib/activity-timer/constants";

type DurationChoice = "none" | "quick" | "custom";

type ActivityTimerDurationPickerProps = {
  timerMode: "countUp" | "countDown";
  targetDurationSeconds: number | null;
  customMinutes: string;
  customSeconds: string;
  onTargetChange: (seconds: number | null) => void;
  onCustomMinutesChange: (value: string) => void;
  onCustomSecondsChange: (value: string) => void;
  disabled?: boolean;
};

function getDurationChoice(
  timerMode: "countUp" | "countDown",
  targetDurationSeconds: number | null,
  customMinutes: string,
  customSeconds: string,
): DurationChoice {
  if (timerMode === "countUp" && targetDurationSeconds == null) {
    return "none";
  }

  const quickOptions =
    timerMode === "countDown"
      ? QUICK_COUNTDOWN_DURATION_OPTIONS
      : QUICK_TARGET_DURATION_OPTIONS.filter((option) => option.seconds != null);

  const isQuick = quickOptions.some(
    (option) => option.seconds === targetDurationSeconds,
  );

  if (isQuick) {
    return "quick";
  }

  if (customMinutes.trim().length > 0 || customSeconds.trim().length > 0) {
    return "custom";
  }

  return "custom";
}

function segmentClass(active: boolean): string {
  return active ? "ui-segment-active" : "ui-segment";
}

export function ActivityTimerDurationPicker({
  timerMode,
  targetDurationSeconds,
  customMinutes,
  customSeconds,
  onTargetChange,
  onCustomMinutesChange,
  onCustomSecondsChange,
  disabled = false,
}: ActivityTimerDurationPickerProps) {
  const choice = getDurationChoice(
    timerMode,
    targetDurationSeconds,
    customMinutes,
    customSeconds,
  );
  const showCustomInput = choice === "custom";
  const quickOptions =
    timerMode === "countDown"
      ? QUICK_COUNTDOWN_DURATION_OPTIONS
      : QUICK_TARGET_DURATION_OPTIONS;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {timerMode === "countDown" ? "Duration" : "Target duration"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {quickOptions.map((option) => {
          const active =
            option.seconds === targetDurationSeconds &&
            (option.seconds != null || choice === "none");

          return (
            <button
              key={option.label}
              type="button"
              disabled={disabled}
              onClick={() => {
                onTargetChange(option.seconds);
                onCustomMinutesChange("");
                onCustomSecondsChange("");
              }}
              className={`min-h-9 rounded-xl px-3 text-sm transition-colors ${segmentClass(
                active,
              )}`}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (timerMode === "countDown") {
              const seconds = customSeconds.trim() || "40";
              onCustomSecondsChange(seconds);
              const parsed = Number.parseInt(seconds, 10);
              onTargetChange(
                Number.isFinite(parsed) && parsed > 0 ? parsed : 40,
              );
              onCustomMinutesChange("");
              return;
            }

            const minutes = customMinutes.trim() || "10";
            onCustomMinutesChange(minutes);
            const parsed = Number.parseInt(minutes, 10);
            onTargetChange(
              Number.isFinite(parsed) && parsed > 0 ? parsed * 60 : 600,
            );
            onCustomSecondsChange("");
          }}
          className={`min-h-9 rounded-xl px-3 text-sm transition-colors ${segmentClass(
            showCustomInput,
          )}`}
        >
          Custom
        </button>
      </div>

      {showCustomInput ? (
        timerMode === "countDown" ? (
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={customSeconds}
              onChange={(event) => {
                const value = event.target.value;
                onCustomSecondsChange(value);
                const seconds = Number.parseInt(value || "0", 10);
                onTargetChange(
                  Number.isFinite(seconds) && seconds > 0 ? seconds : null,
                );
              }}
              className="ui-input w-24"
              placeholder="40"
              disabled={disabled}
              aria-label="Custom countdown seconds"
            />
            <span className="text-sm text-muted">seconds</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={customMinutes}
              onChange={(event) => {
                const value = event.target.value;
                onCustomMinutesChange(value);
                const minutes = Number.parseInt(value || "0", 10);
                onTargetChange(
                  Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : null,
                );
              }}
              className="ui-input w-24"
              placeholder="20"
              disabled={disabled}
              aria-label="Custom target minutes"
            />
            <span className="text-sm text-muted">minutes</span>
          </div>
        )
      ) : null}
    </div>
  );
}
