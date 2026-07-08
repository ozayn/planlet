"use client";

import { useState, useTransition } from "react";

import { addActivityTimerSessionNoteAction } from "@/app/(app)/timer/actions";
import { VoiceTextField } from "@/components/audio/voice-text-field";

type ActivityTimerAddNoteProps = {
  sessionId: string;
  disabled?: boolean;
  onNoteAdded: () => void;
};

export function ActivityTimerAddNote({
  sessionId,
  disabled = false,
  onNoteAdded,
}: ActivityTimerAddNoteProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetDraft() {
    setDraft("");
    setError(null);
    setOpen(false);
  }

  function saveNote(text: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      setError("Add note text before saving.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await addActivityTimerSessionNoteAction({
        sessionId,
        text: trimmed,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      resetDraft();
      onNoteAdded();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="ui-btn-secondary min-h-11 rounded-2xl px-5 text-sm"
      >
        Add note
      </button>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-2xl border border-border-soft bg-surface p-4 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Add note</h3>
        <button
          type="button"
          onClick={resetDraft}
          disabled={disabled || isPending}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <VoiceTextField
        id={`session-note-${sessionId}`}
        label="Note"
        value={draft}
        onChange={setDraft}
        onTranscriptApplied={saveNote}
        placeholder="What happened during this session?"
        disabled={disabled || isPending}
        multiline
        transcriptMode="replace"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveNote(draft)}
          disabled={disabled || isPending || !draft.trim()}
          className="ui-btn-primary min-h-10 px-4 text-sm"
        >
          {isPending ? "Saving…" : "Save note"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
