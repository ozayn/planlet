import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { extractFlashcardsFromSectionText } from "@/lib/life-lab/flashcards";
import {
  buildLifeLabNoteContentBlocks,
  listRenderedVisibleSectionTitles,
  resolveLifeLabNoteContentBlockOptions,
} from "@/lib/life-lab/note-content-blocks";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";
import { extractMermaidOutlineLabels } from "@/lib/life-lab/mermaid-outline";

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

  it("places Learning Map before Short version when prioritizing learning content", () => {
    const body = [
      "## Short version",
      "",
      "A calm summary.",
      "",
      "## Core argument",
      "",
      "The main claim.",
      "",
      "## Learning Map",
      "",
      "```mermaid",
      "flowchart TD",
      '  A["Library"] --> B["Knowledge"]',
      '  B --> C["Memory"]',
      "```",
      "",
      "## Key ideas",
      "",
      "- Idea one",
    ].join("\n");

    const titles = listRenderedVisibleSectionTitles(body, {
      prioritizeLearningMap: true,
      prioritizeShortVersion: true,
    });

    assert.deepEqual(titles.slice(0, 4), [
      "Learning Map",
      "Short version",
      "Core argument",
      "Key ideas",
    ]);

    const blocks = buildLifeLabNoteContentBlocks(body, {
      prioritizeLearningMap: true,
      prioritizeShortVersion: true,
    });

    assert.equal(blocks[0]?.kind, "learning-map");
    if (blocks[0]?.kind === "learning-map") {
      assert.match(blocks[0].mermaidCode, /Library/);
    }
    assert.equal(
      blocks.some(
        (block) =>
          block.kind === "markdown" && block.content.includes("## Short version"),
      ),
      true,
    );
    assert.equal(
      blocks.filter((block) => block.kind === "learning-map").length,
      1,
    );
  });

  it("keeps Learning Map first even when dictionary study sections are present", () => {
    const body = [
      "## Short version",
      "",
      "A calm summary.",
      "",
      "## Learning Map",
      "",
      "```mermaid",
      "flowchart TD",
      '  A["Topic"] --> B["Claim"]',
      "```",
      "",
      "## Key ideas",
      "",
      "- Idea one",
      "",
      "## Dictionary candidates",
      "",
      "- **hegemony** — leadership",
      "",
      "## Vocabulary and phrasing",
      "",
      "- soft power",
    ].join("\n");

    const blocks = buildLifeLabNoteContentBlocks(body, {
      prioritizeLearningMap: true,
    });

    assert.equal(blocks[0]?.kind, "learning-map");
    assert.equal(
      blocks.filter((block) => block.kind === "learning-map").length,
      1,
    );
    assert.equal(
      blocks.some((block) => block.kind === "dictionary-section"),
      true,
    );

    const titles = listRenderedVisibleSectionTitles(body, {
      prioritizeLearningMap: true,
    });
    assert.equal(titles[0], "Learning Map");
    assert.ok(titles.indexOf("Short version") > 0);
    assert.ok(
      titles.indexOf("Dictionary candidates") > titles.indexOf("Key ideas"),
    );
  });

  it("places Learning Map before preface text", () => {
    const body = [
      "Intro paragraph before any heading.",
      "",
      "## Short version",
      "",
      "Summary.",
      "",
      "## Learning Map",
      "",
      "```mermaid",
      "flowchart TD",
      '  A["A"] --> B["B"]',
      "```",
    ].join("\n");

    const blocks = buildLifeLabNoteContentBlocks(body, {
      prioritizeLearningMap: true,
    });

    assert.equal(blocks[0]?.kind, "learning-map");
    assert.equal(blocks[1]?.kind, "markdown");
    if (blocks[1]?.kind === "markdown") {
      assert.match(blocks[1].content, /Intro paragraph/);
    }
  });

  it("renders notes without a Learning Map normally", () => {
    const body = [
      "## Short version",
      "",
      "Summary only.",
      "",
      "## Key ideas",
      "",
      "- One",
    ].join("\n");

    const blocks = buildLifeLabNoteContentBlocks(body, {
      prioritizeLearningMap: true,
      prioritizeShortVersion: true,
    });

    assert.equal(
      blocks.some((block) => block.kind === "learning-map"),
      false,
    );
    assert.match(
      blocks.find((block) => block.kind === "markdown")?.content ?? "",
      /## Short version/,
    );
  });

  it("enables Learning Map first for shared Life Lab note layout options", () => {
    const youtube = resolveLifeLabNoteContentBlockOptions("youtube-learning");
    const podcasts = resolveLifeLabNoteContentBlockOptions("podcasts");
    const references = resolveLifeLabNoteContentBlockOptions("references");

    assert.equal(youtube.prioritizeLearningMap, true);
    assert.equal(podcasts.prioritizeLearningMap, true);
    assert.equal(references.prioritizeLearningMap, true);
    assert.equal(podcasts.prioritizeShortVersion, true);
  });
});

describe("life lab learning map section", () => {
  it("extracts outline labels for concept chips", () => {
    const labels = extractMermaidOutlineLabels(
      [
        "flowchart TD",
        'A["Great Library"] --> B["Scrolls"]',
        'B --> C["Scholarship"]',
      ].join("\n"),
    );

    assert.deepEqual(labels, ["Great Library", "Scrolls", "Scholarship"]);
  });

  it("wires Learning Map first with the shared MermaidBlock renderer", () => {
    const root = join(import.meta.dirname, "../..");
    const noteContent = readFileSync(
      join(root, "components/life-lab/life-lab-note-content.tsx"),
      "utf8",
    );
    const learningMap = readFileSync(
      join(root, "components/life-lab/life-lab-learning-map-compact.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );

    assert.match(noteContent, /LifeLabLearningMapCompact/);
    assert.match(noteContent, /learning-map-first/);
    assert.match(noteContent, /dictionary-section/);
    assert.match(learningMap, /MermaidBlock/);
    assert.match(learningMap, /Open full map/);
    assert.match(learningMap, /MermaidDiagramDialog/);
    assert.match(learningMap, /data-life-lab-learning-map="section"/);
    assert.match(learningMap, /data-life-lab-learning-map-outline/);
    assert.doesNotMatch(learningMap, /data-life-lab-learning-map="compact"/);
    assert.match(page, /LifeLabNoteImageFigure/);
    assert.match(page, /LifeLabNoteContent/);
    assert.doesNotMatch(page, /hasDictionaryStudySections/);
    assert.doesNotMatch(page, /LifeLabNoteDictionarySections/);
    const imageIndex = page.indexOf("LifeLabNoteImageFigure");
    const contentIndex = page.indexOf("<LifeLabNoteContent");
    assert.ok(imageIndex >= 0 && contentIndex > imageIndex);
  });
});
