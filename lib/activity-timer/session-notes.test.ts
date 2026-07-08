import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSessionNotesPreview,
  computeSessionNoteOffsetSeconds,
  formatSyncedSessionNotes,
  serializeActivityTimerSessionNote,
} from "@/lib/activity-timer/session-notes";

describe("activity timer session notes", () => {
  it("serializes timestamped note labels", () => {
    const note = serializeActivityTimerSessionNote(
      {
        id: "note-1",
        sessionId: "session-1",
        userId: "user-1",
        text: "Finished organizing the bookshelf.",
        recordedAt: new Date("2026-07-08T18:14:00.000Z"),
        offsetSeconds: 804,
        createdAt: new Date("2026-07-08T18:14:00.000Z"),
        updatedAt: new Date("2026-07-08T18:14:00.000Z"),
      },
      "America/New_York",
    );

    assert.match(note.timeLabel, /2:14/);
    assert.equal(
      note.displayLabel,
      `${note.timeLabel} — Finished organizing the bookshelf.`,
    );
  });

  it("computes offset seconds from session start", () => {
    const startedAt = new Date("2026-07-08T18:00:00.000Z");
    const recordedAt = new Date("2026-07-08T18:12:34.000Z");

    assert.equal(
      computeSessionNoteOffsetSeconds(startedAt, recordedAt),
      754,
    );
  });

  it("builds synced legacy notes text and previews", () => {
    const notes = [
      {
        text: "Finished organizing the bookshelf.",
        recordedAt: new Date("2026-07-08T18:14:00.000Z"),
      },
      {
        text: "Started working on the closet.",
        recordedAt: new Date("2026-07-08T18:34:00.000Z"),
      },
    ];

    const serialized = notes.map((note, index) =>
      serializeActivityTimerSessionNote(
        {
          id: `note-${index}`,
          sessionId: "session-1",
          userId: "user-1",
          text: note.text,
          recordedAt: note.recordedAt,
          offsetSeconds: 0,
          createdAt: note.recordedAt,
          updatedAt: note.recordedAt,
        },
        "America/New_York",
      ),
    );

    assert.match(
      formatSyncedSessionNotes(notes, "America/New_York") ?? "",
      /Finished organizing the bookshelf\./,
    );
    assert.equal(
      buildSessionNotesPreview(serialized),
      "Finished organizing the bookshelf. (+1 more)",
    );
  });
});
