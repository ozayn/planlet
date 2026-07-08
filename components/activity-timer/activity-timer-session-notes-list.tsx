"use client";

import type { SerializedActivityTimerSessionNote } from "@/lib/activity-timer/constants";

type ActivityTimerSessionNotesListProps = {
  notes: SerializedActivityTimerSessionNote[];
  title?: string;
  emptyLabel?: string;
};

export function ActivityTimerSessionNotesList({
  notes,
  title = "Notes",
  emptyLabel,
}: ActivityTimerSessionNotesListProps) {
  if (notes.length === 0) {
    return emptyLabel ? (
      <p className="text-sm text-muted">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className="w-full max-w-md space-y-2 text-left">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-xl border border-border-soft bg-surface px-3 py-2.5 text-sm shadow-sm"
          >
            <p className="text-xs text-muted-light">{note.timeLabel}</p>
            <p className="mt-0.5 leading-relaxed text-foreground" dir="auto">
              {note.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
