import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  buildNarrationPlaybackChunks,
} from "@/lib/life-lab/narration-chunks";
import { NARRATION_INSTRUCTION_VERSION } from "@/lib/life-lab/narration-config";
import {
  buildNarrationDocument,
  narrationDocumentToPlainText,
} from "@/lib/life-lab/narration-text";

describe("life lab narration text", () => {
  it("builds a narration document with title and readable sections", () => {
    const sections = buildNarrationDocument({
      title: "Great Art Explained",
      content: [
        "# Great Art Explained",
        "",
        "## Summary",
        "A concise overview of the painting.",
        "",
        "## Source notes",
        "https://example.com/source",
        "",
        "```mermaid",
        "graph TD",
        "A-->B",
        "```",
        "",
        "## Key ideas",
        "- Composition matters",
        "- Color guides emotion",
      ].join("\n"),
    });

    assert.equal(sections[0]?.label, "Title");
    assert.equal(sections.some((section) => section.label === "Summary"), true);
    assert.equal(
      sections.some((section) => section.label === "Source notes"),
      false,
    );
    assert.equal(
      sections.some((section) => section.label === "Key ideas"),
      true,
    );
    assert.equal(
      narrationDocumentToPlainText(sections).includes("https://"),
      false,
    );
  });

  it("includes flashcards when enabled", () => {
    const sections = buildNarrationDocument({
      title: "Study note",
      content: "## Summary\nA note.",
      includeFlashcards: true,
      flashcards: [{ question: "What is chiaroscuro?", answer: "Light and shadow." }],
    });

    assert.equal(sections.at(-1)?.label, "Flashcards");
    assert.match(sections.at(-1)?.body ?? "", /chiaroscuro/i);
  });
});

describe("life lab narration chunks", () => {
  it("chunks long narration by safe character limits", () => {
    const sections = buildNarrationDocument({
      title: "Long note",
      content: `## Summary\n${"Word ".repeat(900)}`,
    });
    const chunks = buildNarrationPlaybackChunks(sections, 500);

    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => chunk.text.length <= 500));
  });
});

describe("life lab narration cache keys", () => {
  it("changes cache key when voice changes", () => {
    const base = {
      driveFileId: "file-1",
      noteModifiedTime: "2026-07-11T10:00:00.000Z",
      contentHash: hashNarrationContent("hello"),
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      chunkIndex: 0,
    };

    const coral = buildNarrationCacheKey({ ...base, voice: "coral" });
    const alloy = buildNarrationCacheKey({ ...base, voice: "alloy" });

    assert.notEqual(coral, alloy);
  });

  it("changes cache key when modified time changes", () => {
    const base = {
      driveFileId: "file-1",
      contentHash: hashNarrationContent("hello"),
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: "coral",
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      chunkIndex: 0,
    };

    const older = buildNarrationCacheKey({
      ...base,
      noteModifiedTime: "2026-07-10T10:00:00.000Z",
    });
    const newer = buildNarrationCacheKey({
      ...base,
      noteModifiedTime: "2026-07-11T10:00:00.000Z",
    });

    assert.notEqual(older, newer);
  });
});
