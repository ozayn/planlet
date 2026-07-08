"use client";

import { QUICK_TARGET_DURATION_OPTIONS } from "@/lib/activity-timer/constants";

type DurationChoice = "none" | "quick" | "custom";

type ActivityTimerDurationPickerProps = {
  targetDurationSeconds: number | null;
  customMinutes: string;
  onTargetChange: (seconds: number | null) => void;
  onCustomMinutesChange: (value: string) => void;
  disabled?: boolean;
};

function getDurationChoice(
  targetDurationSeconds: number | null,
  customMinutes: string,
): DurationChoice {
  if (targetDurationSeconds == null) {
    return "none";
  }

  const isQuick = QUICK_TARGET_DURATION_OPTIONS.some(
    (option) => option.seconds === targetDurationSeconds,
  );

  if (isQuick) {
    return "quick";
  }

  if (customMinutes.trim().length > 0) {
    return "custom";
  }

  return "custom";
}

function segmentClass(active: boolean): string {
  return active ? "ui-segment-active" : "ui-segment";
}

export function ActivityTimerDurationPicker({
  targetDurationSeconds,
  customMinutes,
  onTargetChange,
  onCustomMinutesChange,
  disabled = false,
}: ActivityTimerDurationPickerProps) {
  const choice = getDurationChoice(targetDurationSeconds, customMinutes);
  const showCustomInput = choice === "custom";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Target duration</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_TARGET_DURATION_OPTIONS.map((option) => {
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
            const minutes = customMinutes.trim() || "10";
            onCustomMinutesChange(minutes);
            const parsed = Number.parseInt(minutes, 10);
            onTargetChange(
              Number.isFinite(parsed) && parsed > 0 ? parsed * 60 : 600,
            );
          }}
          className={`min-h-9 rounded-xl px-3 text-sm transition-colors ${segmentClass(
            showCustomInput,
          )}`}
        >
          Custom
        </button>
      </div>

      {showCustomInput ? (
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
      ) : null}
    </div>
  );
}
