"use client";

import { useEffect, useState, useTransition } from "react";

import {
  createActivityTimerPresetAction,
  updateActivityTimerPresetAction,
} from "@/app/(app)/timer/actions";
import { ActivityTimerDurationPicker } from "@/components/activity-timer/activity-timer-duration-picker";
import { ActivityTimerPresetIconPicker } from "@/components/activity-timer/activity-timer-preset-icon-picker";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import type {
  ActivityTimerMode,
  SerializedActivityTimerPresetManagement,
} from "@/lib/activity-timer/constants";
import {
  QUICK_COUNTDOWN_DURATION_OPTIONS,
  QUICK_TARGET_DURATION_OPTIONS,
} from "@/lib/activity-timer/constants";

type ActivityTimerPresetFormSheetProps = {
  preset: SerializedActivityTimerPresetManagement | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function resolveCustomMinutes(
  timerMode: ActivityTimerMode,
  targetDurationSeconds: number | null,
): string {
  if (targetDurationSeconds == null || timerMode === "countDown") {
    return "";
  }

  const isQuick = QUICK_TARGET_DURATION_OPTIONS.some(
    (option) => option.seconds === targetDurationSeconds,
  );

  if (isQuick) {
    return "";
  }

  return String(Math.round(targetDurationSeconds / 60));
}

function resolveCustomSeconds(
  timerMode: ActivityTimerMode,
  targetDurationSeconds: number | null,
): string {
  if (targetDurationSeconds == null || timerMode !== "countDown") {
    return "";
  }

  const isQuick = QUICK_COUNTDOWN_DURATION_OPTIONS.some(
    (option) => option.seconds === targetDurationSeconds,
  );

  if (isQuick) {
    return "";
  }

  return String(targetDurationSeconds);
}

function segmentClass(active: boolean): string {
  return active ? "ui-segment-active" : "ui-segment";
}

export function ActivityTimerPresetFormSheet({
  preset,
  open,
  onClose,
  onSaved,
}: ActivityTimerPresetFormSheetProps) {
  const isEditing = preset != null;
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [iconName, setIconName] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<ActivityTimerMode>("countUp");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<
    number | null
  >(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [customSeconds, setCustomSeconds] = useState("");
  const [isArchived, setIsArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextTimerMode = preset?.timerMode ?? "countUp";
    const nextTarget = preset?.targetDurationSeconds ?? null;

    setTitle(preset?.title ?? "");
    setCategory(preset?.category ?? "");
    setIconName(preset?.iconName ?? null);
    setTimerMode(nextTimerMode);
    setTargetDurationSeconds(nextTarget);
    setCustomMinutes(resolveCustomMinutes(nextTimerMode, nextTarget));
    setCustomSeconds(resolveCustomSeconds(nextTimerMode, nextTarget));
    setIsArchived(preset?.isArchived ?? false);
    setError(null);
  }, [open, preset]);

  function handleTimerModeChange(nextMode: ActivityTimerMode) {
    setTimerMode(nextMode);

    if (nextMode === "countDown") {
      setTargetDurationSeconds((current) => current ?? 40);
      setCustomMinutes("");
      return;
    }

    setCustomSeconds("");
  }

  function handleSave() {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (
      timerMode === "countDown" &&
      (targetDurationSeconds == null || targetDurationSeconds <= 0)
    ) {
      setError("Countdown presets need a duration.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const payload = {
        title: trimmedTitle,
        category: category.trim() || null,
        iconName,
        timerMode,
        targetDurationSeconds:
          timerMode === "countDown" ? targetDurationSeconds : targetDurationSeconds,
        isArchived,
      };

      const result = isEditing
        ? await updateActivityTimerPresetAction({
            presetId: preset.id,
            ...payload,
          })
        : await createActivityTimerPresetAction(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onSaved();
      onClose();
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit preset" : "Add preset"}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ui-btn-primary"
            disabled={isPending || !title.trim()}
          >
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="preset-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="preset-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="ui-input w-full"
            placeholder="e.g. Tapping"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="preset-category" className="text-sm font-medium">
            Category
          </label>
          <input
            id="preset-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="ui-input w-full"
            placeholder="Optional"
            disabled={isPending}
          />
        </div>

        <ActivityTimerPresetIconPicker
          value={iconName}
          onChange={setIconName}
          disabled={isPending}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Timer type</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleTimerModeChange("countUp")}
              className={`min-h-9 rounded-xl px-3 text-sm transition-colors ${segmentClass(
                timerMode === "countUp",
              )}`}
            >
              Count up
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleTimerModeChange("countDown")}
              className={`min-h-9 rounded-xl px-3 text-sm transition-colors ${segmentClass(
                timerMode === "countDown",
              )}`}
            >
              Countdown
            </button>
          </div>
        </div>

        <ActivityTimerDurationPicker
          timerMode={timerMode}
          targetDurationSeconds={targetDurationSeconds}
          customMinutes={customMinutes}
          customSeconds={customSeconds}
          onTargetChange={setTargetDurationSeconds}
          onCustomMinutesChange={setCustomMinutes}
          onCustomSecondsChange={setCustomSeconds}
          disabled={isPending}
        />

        {isEditing ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isArchived}
              onChange={(event) => setIsArchived(event.target.checked)}
              disabled={isPending}
              className="size-4 rounded border-border-soft"
            />
            Archived
          </label>
        ) : null}

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </SimpleSheet>
  );
}
