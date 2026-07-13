import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildReadAloudSections,
  findReadAloudSectionIndex,
} from "@/lib/life-lab/read-aloud-sections";
import { buildReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";

const SAMPLE_NOTE = {
  title: "Great Art Explained",
  content: [
    "# Great Art Explained",
    "",
    "## Short version",
    "A quick overview.",
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
    "",
    "## Summary",
    "Repeated heading body.",
  ].join("\n"),
};

describe("read aloud sections", () => {
  it("builds a shared section list without internal Title labels", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);

    assert.equal(
      sections.some((section) => section.title === "Title"),
      false,
    );
    assert.equal(
      sections.some((section) => section.title === "Summary"),
      true,
    );
    assert.equal(
      sections.some((section) => section.title === "Source notes"),
      false,
    );
    assert.equal(
      sections.some((section) => section.title === "Key ideas"),
      true,
    );
  });

  it("excludes hidden and technical sections", () => {
    const sections = buildReadAloudSections({
      title: "Note",
      content: [
        "## Summary",
        "Readable.",
        "## Developer information",
        "Hidden.",
        "## Technical details",
        "Also hidden.",
      ].join("\n"),
    });

    assert.deepEqual(
      sections.map((section) => section.title),
      ["Note", "Summary"],
    );
  });

  it("creates stable unique ids for duplicate headings", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);
    const summarySections = sections.filter((section) => section.title === "Summary");

    assert.equal(summarySections.length, 2);
    assert.notEqual(summarySections[0]?.id, summarySections[1]?.id);
    assert.match(summarySections[1]?.id ?? "", /summary-2$/);
  });

  it("respects optional flashcards and transcript inclusion settings", () => {
    const withoutOptional = buildReadAloudSections({
      title: "Study note",
      content: [
        "## Summary",
        "A note.",
        "## Full transcript",
        "Long transcript text.",
      ].join("\n"),
      flashcards: [{ question: "What is chiaroscuro?", answer: "Light and shadow." }],
      inclusion: {
        flashcards: false,
        fullTranscript: false,
      },
    });

    assert.equal(
      withoutOptional.some((section) => section.title === "Flashcards"),
      false,
    );
    assert.equal(
      withoutOptional.some((section) => section.title === "Full transcript"),
      false,
    );

    const withOptional = buildReadAloudSections({
      title: "Study note",
      content: "## Summary\nA note.",
      flashcards: [{ question: "What is chiaroscuro?", answer: "Light and shadow." }],
      inclusion: {
        flashcards: true,
        fullTranscript: true,
      },
    });

    assert.equal(
      withOptional.some((section) => section.title === "Flashcards"),
      true,
    );
  });

  it("finds the selected section index for playback start", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);
    const keyIdeas = sections.find((section) => section.title === "Key ideas");

    assert.ok(keyIdeas);
    assert.equal(sections[findReadAloudSectionIndex(sections, keyIdeas.id)]?.id, keyIdeas.id);
  });

  it("falls back when a stored section id no longer exists", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);

    assert.equal(findReadAloudSectionIndex(sections, "removed-section"), 0);
  });

  it("uses the same parser for playback chunk planning", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);
    const plan = buildReadAloudPlaybackPlan(sections);
    const summaryRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Summary",
    );

    assert.ok(summaryRange);
    assert.equal(plan.chunks[summaryRange.firstChunkIndex]?.sectionId, summaryRange.sectionId);
    assert.match(plan.chunks[summaryRange.firstChunkIndex]?.text ?? "", /^Summary\./);
  });
});
