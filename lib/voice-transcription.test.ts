import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  combineVoiceTranscript,
  type VoiceTranscriptMode,
} from "@/lib/voice-transcription";

describe("voice transcription helpers", () => {
  it("replaces empty text with a trimmed transcript", () => {
    assert.equal(
      combineVoiceTranscript("", "  Reorganizing the kitchen cabinets  "),
      "Reorganizing the kitchen cabinets",
    );
  });

  it("replaces existing text by default", () => {
    assert.equal(
      combineVoiceTranscript("Old title", "New title"),
      "New title",
    );
  });

  it("appends transcript blocks for session notes", () => {
    assert.equal(
      combineVoiceTranscript(
        "Finished the bedroom.",
        "Moved on to the closet.",
        "append",
      ),
      "Finished the bedroom.\n\nMoved on to the closet.",
    );
  });

  it("returns the current value when transcript is empty", () => {
    const modes: VoiceTranscriptMode[] = ["replace", "append"];
    for (const mode of modes) {
      assert.equal(combineVoiceTranscript("Keep me", "   ", mode), "Keep me");
    }
  });
});
