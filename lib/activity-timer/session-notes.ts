import type { ActivityTimerSessionNote } from "@/app/generated/prisma/client";

import { formatSessionClockTime } from "@/lib/activity-timer/format";
import { durationSecondsBetween } from "@/lib/activity-timer/format";

export const VOICE_TRANSCRIPTION_PRIVACY_TEXT =
  "Audio is only used for transcription and is not saved.";

export const MAX_SESSION_NOTE_LENGTH = 2000;

export type SerializedActivityTimerSessionNote = {
  id: string;
  sessionId: string;
  text: string;
  recordedAt: string;
  offsetSeconds: number;
  timeLabel: string;
  displayLabel: string;
};

export function serializeActivityTimerSessionNote(
  note: ActivityTimerSessionNote,
  timezone: string,
): SerializedActivityTimerSessionNote {
  const timeLabel = formatSessionClockTime(note.recordedAt, timezone);

  return {
    id: note.id,
    sessionId: note.sessionId,
    text: note.text,
    recordedAt: note.recordedAt.toISOString(),
    offsetSeconds: note.offsetSeconds,
    timeLabel,
    displayLabel: `${timeLabel} — ${note.text}`,
  };
}

export function buildSessionNotesPreview(
  notes: SerializedActivityTimerSessionNote[],
): string | null {
  if (notes.length === 0) {
    return null;
  }

  const first = notes[0]?.text.trim();

  if (!first) {
    return null;
  }

  if (notes.length === 1) {
    return first;
  }

  return `${first} (+${notes.length - 1} more)`;
}

export function formatSyncedSessionNotes(
  notes: Array<Pick<ActivityTimerSessionNote, "text" | "recordedAt">>,
  timezone: string,
): string | null {
  if (notes.length === 0) {
    return null;
  }

  return notes
    .map((note) => {
      const timeLabel = formatSessionClockTime(note.recordedAt, timezone);
      return `${timeLabel} — ${note.text.trim()}`;
    })
    .join("\n");
}

export function computeSessionNoteOffsetSeconds(
  sessionStartedAt: Date,
  recordedAt: Date,
): number {
  return durationSecondsBetween(sessionStartedAt, recordedAt);
}
