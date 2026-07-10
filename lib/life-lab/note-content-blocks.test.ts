import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractFlashcardsFromSectionText } from "@/lib/life-lab/flashcards";
import { buildLifeLabNoteContentBlocks } from "@/lib/life-lab/note-content-blocks";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";

describe("life lab note content blocks", () => {
  it("parses inline Q/A flashcards onto separate cards", () => {
    const cards = extractFlashcardsFromSectionText(
      "Q: What is a P-functioning body? A: A body with the capacities that make it count as a person, such as thought, planning, communication, and feeling.",
    );

    assert.equal(cards.length, 1);
    assert.match(cards[0]?.question ?? "", /P-functioning body/i);
    assert.match(cards[0]?.answer ?? "", /capacities/i);
  });

  it("hides metadata-only full transcript sections from note blocks", () => {
    const body = [
      "## Summary",
      "",
      "Main learning content.",
      "",
      "## Full transcript",
      "",
      "- Transcript available: yes",
      "- Full transcript omitted for readability and mobile use",
      "",
      "## Optional Flashcards",
      "",
      "Q: One? A: Answer one.",
    ].join("\n");

    const blocks = buildLifeLabNoteContentBlocks(body);

    assert.equal(blocks.some((block) => block.kind === "transcript"), false);
    assert.equal(
      blocks.some((block) => block.kind === "flashcards" && block.cards.length === 1),
      true,
    );
  });

  it("keeps real transcript sections as collapsible blocks", () => {
    const body = [
      "## Full transcript",
      "",
      "0:00 Opening remarks about the topic.",
      "",
      "0:42 A longer spoken passage with enough content to qualify as a real transcript rather than metadata.",
    ].join("\n");

    const blocks = buildLifeLabNoteContentBlocks(body);
    const transcript = blocks.find((block) => block.kind === "transcript");

    assert.ok(transcript);
    assert.match(transcript.content, /Opening remarks/);
  });

  it("strips metadata-only transcript sections during markdown preparation", () => {
    const prepared = prepareLifeLabMarkdownForReading(
      "## Full transcript\n\n- Transcript available: yes\n\n## Summary\n\nKeep this.",
    );

    assert.doesNotMatch(prepared, /Transcript available/);
    assert.match(prepared, /## Summary/);
  });
});
