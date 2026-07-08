"use client";

import { useEffect, useState, useTransition } from "react";

import {
  createActivityTimerPresetAction,
  startActivityTimerAction,
} from "@/app/(app)/timer/actions";
import { useActivityTimer } from "@/components/activity-timer/activity-timer-context";
import { VoiceTextField } from "@/components/activity-timer/voice-text-field";
import { SimpleSheet } from "@/components/ui/simple-sheet";

type ActivityTimerCustomSheetProps = {
  open: boolean;
  onClose: () => void;
  onStarted: () => void;
};

export function ActivityTimerCustomSheet({
  open,
  onClose,
  onStarted,
}: ActivityTimerCustomSheetProps) {
  const { setActiveSession } = useActivityTimer();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle("");
    setCategory("");
    setNotes("");
    setError(null);
  }, [open]);

  function handleStart(saveAsPreset: boolean) {
    setError(null);

    startTransition(async () => {
      if (saveAsPreset) {
        const presetResult = await createActivityTimerPresetAction({
          title: title.trim(),
          category: category.trim() || null,
        });

        if (!presetResult.success) {
          setError(presetResult.error);
          return;
        }
      }

      const result = await startActivityTimerAction({
        title: title.trim(),
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setActiveSession(result.activeSession);
      onClose();
      onStarted();
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title="New activity"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
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
            onClick={() => handleStart(true)}
            className="ui-btn-secondary"
            disabled={isPending || !title.trim()}
          >
            Save preset
          </button>
          <button
            type="button"
            onClick={() => handleStart(false)}
            className="ui-btn-primary"
            disabled={isPending || !title.trim()}
          >
            Start
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <VoiceTextField
          id="custom-activity-title"
          label="Activity title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Tidy room — closet"
          disabled={isPending}
        />

        <div className="space-y-1">
          <label htmlFor="custom-activity-category" className="text-sm font-medium">
            Category
          </label>
          <input
            id="custom-activity-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="ui-input w-full"
            placeholder="Optional"
            disabled={isPending}
          />
        </div>

        <VoiceTextField
          id="custom-activity-notes"
          label="Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Optional"
          disabled={isPending}
          multiline
        />

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </SimpleSheet>
  );
}
