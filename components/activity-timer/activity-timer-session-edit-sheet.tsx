"use client";

import { useEffect, useState, useTransition } from "react";

import {
  updateActivityTimerSessionAction,
  updateActivityTimerSessionNoteAction,
} from "@/app/(app)/timer/actions";
import { ActivityTimerAddNote } from "@/components/activity-timer/activity-timer-add-note";
import { VoiceTextField } from "@/components/audio/voice-text-field";
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
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});
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
    setNoteTexts(
      Object.fromEntries(
        session.sessionNotes.map((note) => [note.id, note.text]),
      ),
    );
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
      const sessionResult = await updateActivityTimerSessionAction({
        sessionId: session.id,
        title: title.trim(),
        category: category.trim() || null,
        durationSeconds: minutes * 60 + seconds,
      });

      if (!sessionResult.success) {
        setError(sessionResult.error);
        return;
      }

      for (const note of session.sessionNotes) {
        const nextText = noteTexts[note.id]?.trim() ?? "";

        if (!nextText || nextText === note.text.trim()) {
          continue;
        }

        const noteResult = await updateActivityTimerSessionNoteAction({
          noteId: note.id,
          text: nextText,
        });

        if (!noteResult.success) {
          setError(noteResult.error);
          return;
        }
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
        <VoiceTextField
          id="session-title"
          label="Title"
          value={title}
          onChange={setTitle}
          disabled={isPending}
        />

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

        {session?.sessionNotes.length ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Notes</h3>
            {session.sessionNotes.map((note) => (
              <div key={note.id} className="space-y-1">
                <p className="text-xs text-muted-light">{note.timeLabel}</p>
                <VoiceTextField
                  id={`edit-note-${note.id}`}
                  label="Note"
                  value={noteTexts[note.id] ?? ""}
                  onChange={(value) =>
                    setNoteTexts((current) => ({
                      ...current,
                      [note.id]: value,
                    }))
                  }
                  disabled={isPending}
                  multiline
                  transcriptMode="replace"
                />
              </div>
            ))}
          </div>
        ) : null}

        {session ? (
          <ActivityTimerAddNote
            sessionId={session.id}
            disabled={isPending}
            onNoteAdded={onClose}
          />
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
