"use client";

import { useEffect, useState, useTransition } from "react";

import { updateActivityTimerSessionAction } from "@/app/(app)/timer/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import type { SerializedActivityTimerSession } from "@/lib/activity-timer/constants";
import { formatActivityDuration } from "@/lib/activity-timer/format";

type ActivityTimerSessionEditSheetProps = {
  session: SerializedActivityTimerSession | null;
  open: boolean;
  onClose: () => void;
};

export function ActivityTimerSessionEditSheet({
  session,
  open,
  onClose,
}: ActivityTimerSessionEditSheetProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [durationSecondsPart, setDurationSecondsPart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    const total = session.durationSeconds ?? 0;
    setTitle(session.title);
    setCategory(session.category ?? "");
    setNotes(session.notes ?? "");
    setDurationMinutes(String(Math.floor(total / 60)));
    setDurationSecondsPart(String(total % 60).padStart(2, "0"));
    setError(null);
  }, [open, session]);

  function handleSave() {
    if (!session) {
      return;
    }

    const minutes = Number.parseInt(durationMinutes || "0", 10);
    const seconds = Number.parseInt(durationSecondsPart || "0", 10);

    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) {
      setError("Enter a valid duration.");
      return;
    }

    startTransition(async () => {
      const result = await updateActivityTimerSessionAction({
        sessionId: session.id,
        title: title.trim(),
        category: category.trim() || null,
        notes: notes.trim() || null,
        durationSeconds: minutes * 60 + seconds,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onClose();
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title="Edit session"
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
          <label htmlFor="session-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="session-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="ui-input w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="session-category" className="text-sm font-medium">
            Category
          </label>
          <input
            id="session-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="ui-input w-full"
            placeholder="Optional"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Duration</label>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="ui-input w-20"
              aria-label="Minutes"
            />
            <span className="text-sm text-muted">m</span>
            <input
              inputMode="numeric"
              value={durationSecondsPart}
              onChange={(event) => setDurationSecondsPart(event.target.value)}
              className="ui-input w-20"
              aria-label="Seconds"
            />
            <span className="text-sm text-muted">s</span>
          </div>
          {session ? (
            <p className="text-xs text-muted">
              Logged as {formatActivityDuration(session.durationSeconds ?? 0)}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="session-notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="session-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="ui-input w-full resize-y"
            placeholder="Optional"
          />
        </div>

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </SimpleSheet>
  );
}
