import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildLifeLabNoteContentBlocks } from "@/lib/life-lab/note-content-blocks";
import {
  resolveLifeLabPrintSectionDecision,
  shouldExcludeSectionFromLifeLabPrint,
  shouldIncludeSectionInLifeLabPrint,
} from "@/lib/life-lab/print-section-policy";
import {
  lifeLabNotePrintHref,
  resolveLifeLabPrintDocumentTitle,
} from "@/lib/life-lab/print-document";

describe("life lab print section policy", () => {
  it("excludes flashcards, Q/A, and technical headings", () => {
    assert.equal(
      resolveLifeLabPrintSectionDecision("Optional Flashcards"),
      "exclude",
    );
    assert.equal(
      resolveLifeLabPrintSectionDecision("Questions for later"),
      "exclude",
    );
    assert.equal(resolveLifeLabPrintSectionDecision("Quiz"), "exclude");
    assert.equal(
      resolveLifeLabPrintSectionDecision("Processing notes"),
      "exclude",
    );
    assert.equal(
      resolveLifeLabPrintSectionDecision("Developer information"),
      "exclude",
    );
    assert.equal(shouldExcludeSectionFromLifeLabPrint("Flashcards"), true);
  });

  it("includes educational reading sections", () => {
    for (const title of [
      "Summary",
      "At a glance",
      "Key ideas",
      "Why it matters",
      "Learning Map",
      "Vocabulary",
      "Timeline",
      "Historical background",
    ]) {
      assert.equal(
        shouldIncludeSectionInLifeLabPrint(title),
        true,
        title,
      );
    }
  });

  it("omits flashcards and questions from print content blocks", () => {
    const body = [
      "## Summary",
      "",
      "Core argument about the topic.",
      "",
      "## Questions for later",
      "",
      "- What else should I study?",
      "",
      "## Optional Flashcards",
      "",
      "Q: One? A: Answer one.",
      "",
      "## Why it matters",
      "",
      "It clarifies a durable pattern.",
    ].join("\n");

    const reading = buildLifeLabNoteContentBlocks(body);
    assert.equal(
      reading.some((block) => block.kind === "flashcards"),
      true,
    );

    const print = buildLifeLabNoteContentBlocks(body, { forPrint: true });
    assert.equal(
      print.some((block) => block.kind === "flashcards"),
      false,
    );

    const markdown = print
      .filter((block) => block.kind === "markdown")
      .map((block) => (block.kind === "markdown" ? block.content : ""))
      .join("\n");

    assert.match(markdown, /Summary/);
    assert.match(markdown, /Why it matters/);
    assert.doesNotMatch(markdown, /Questions for later/i);
    assert.doesNotMatch(markdown, /Optional Flashcards/i);
    assert.doesNotMatch(markdown, /Q:\s*One\?/i);
  });

  it("keeps Mermaid learning maps in print blocks", () => {
    const body = [
      "## Learning Map",
      "",
      "```mermaid",
      "flowchart TD",
      "  A[Start] --> B[End]",
      "```",
      "",
      "## Summary",
      "",
      "Short summary.",
    ].join("\n");

    const print = buildLifeLabNoteContentBlocks(body, {
      forPrint: true,
      prioritizeLearningMap: true,
    });

    assert.equal(
      print.some(
        (block) =>
          block.kind === "learning-map" &&
          block.mermaidCode.includes("flowchart"),
      ),
      true,
    );
  });
});

describe("life lab print document title", () => {
  it("prefers display_title over cleaned YouTube titles", () => {
    const title = resolveLifeLabPrintDocumentTitle({
      title: "Raw video title with noise",
      sectionId: "youtube-learning",
      relativePath: "videos/2026-08-12-example.md",
      metadata: {
        display_title: "عنوان فارسی",
        type: "youtube-note",
      },
    });

    assert.equal(title, "عنوان فارسی");
  });

  it("builds the print view href", () => {
    assert.equal(
      lifeLabNotePrintHref({
        sectionId: "youtube-learning",
        slug: "videos__example",
      }),
      "/life-lab/youtube-learning/videos__example?view=print",
    );
  });
});
