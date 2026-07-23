import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import {
  compareReadAloudSectionOrder,
  getReadAloudSectionIds,
} from "@/lib/life-lab/read-aloud-section-order";
import { buildReadAloudSections } from "@/lib/life-lab/read-aloud-sections";

const NOTE_CONTENT = [
  "## Short version",
  "Short.",
  "## Summary",
  "Summary body.",
  "## Key ideas",
  "Ideas body.",
  "## Learning Map",
  "Map body.",
  "## Connections",
  "Connections body.",
  "## Questions",
  "Questions body.",
  "## Optional Flashcards",
  "Q: One? A: Answer one.",
].join("\n");

describe("read aloud section order", () => {
  it("matches device voice and OpenAI narration section ids", () => {
    const input = {
      title: "Study note",
      content: NOTE_CONTENT,
      inclusion: {
        questions: true,
        flashcards: true,
      },
    };

    const deviceVoiceSectionIds = getReadAloudSectionIds(input);
    const openAiSectionIds = getReadAloudSectionIds(input);

    assert.deepEqual(deviceVoiceSectionIds, openAiSectionIds);
  });

  it("matches rendered note section order for included sections", () => {
    const diagnostic = compareReadAloudSectionOrder({
      title: "Study note",
      content: NOTE_CONTENT,
      inclusion: {
        questions: true,
        flashcards: true,
      },
    });

    assert.equal(diagnostic.firstMismatch, null);
    assert.deepEqual(
      diagnostic.narrationSectionTitles,
      [
        "Learning Map",
        "Short version",
        "Summary",
        "Key ideas",
        "Connections",
        "Questions",
        "Optional Flashcards",
      ],
    );
  });

  it("plays cached chunks in section and chunk index order", () => {
    const sections = buildReadAloudSections({
      title: "Study note",
      content: NOTE_CONTENT,
      inclusion: {
        questions: true,
      },
    });
    const plan = buildReadAloudPlaybackPlan(sections, 40);

    const chunkSectionIndexes = plan.chunks.map((chunk) => chunk.sectionIndex);
    const sorted = [...chunkSectionIndexes].toSorted((left, right) => left - right);

    assert.deepEqual(chunkSectionIndexes, sorted);

    for (const range of plan.sectionChunkRanges) {
      const sectionChunks = plan.chunks.slice(
        range.firstChunkIndex,
        range.firstChunkIndex + range.chunkCount,
      );
      const chunkIndexes = sectionChunks.map((chunk) => chunk.sectionChunkIndex);

      assert.deepEqual(
        chunkIndexes,
        chunkIndexes.toSorted((left, right) => left - right),
      );
    }
  });

  it("preserves section order when optional sections are excluded", () => {
    const diagnostic = compareReadAloudSectionOrder({
      title: "Study note",
      content: NOTE_CONTENT,
      inclusion: {
        questions: false,
        flashcards: false,
      },
    });

    assert.equal(diagnostic.firstMismatch, null);
    assert.deepEqual(diagnostic.narrationSectionTitles, [
      "Learning Map",
      "Short version",
      "Summary",
      "Key ideas",
      "Connections",
    ]);
  });
});
