import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";

describe("life lab transcript sections", () => {
  it("recognizes full transcript headings", () => {
    assert.equal(isFullTranscriptSectionTitle("Full transcript"), true);
    assert.equal(isFullTranscriptSectionTitle("Transcript"), true);
    assert.equal(isFullTranscriptSectionTitle("Summary"), false);
  });

  it("detects metadata-only transcript sections", () => {
    const metadataOnly = [
      "- Transcript available: yes",
      "- Full transcript omitted for readability and mobile use",
      "- This note uses the YouTube description, chapter list, and English captions",
    ].join("\n");

    assert.equal(isTranscriptMetadataOnly(metadataOnly), true);
  });

  it("detects real transcript content", () => {
    const realTranscript = [
      "0:00 Welcome back to the series.",
      "",
      "0:15 Today we look at how institutions perform legitimacy under pressure, using examples from Iran, Europe, and migration policy across the Mediterranean.",
      "",
      "1:02 The speaker argues that public ritual still matters even when the underlying institutions are contested.",
    ].join("\n");

    assert.equal(isTranscriptMetadataOnly(realTranscript), false);
  });
});
