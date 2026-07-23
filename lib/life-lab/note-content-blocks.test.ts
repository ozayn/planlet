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

describe("life lab learning map compact preview", () => {
  it("extracts outline labels without rendering Mermaid", () => {
    const labels = extractMermaidOutlineLabels(
      [
        "flowchart TD",
        'A["Great Library"] --> B["Scrolls"]',
        'B --> C["Scholarship"]',
      ].join("\n"),
    );

    assert.deepEqual(labels, ["Great Library", "Scrolls", "Scholarship"]);
  });

  it("wires compact Learning Map expand into the shared note content path", () => {
    const root = join(import.meta.dirname, "../..");
    const noteContent = readFileSync(
      join(root, "components/life-lab/life-lab-note-content.tsx"),
      "utf8",
    );
    const compact = readFileSync(
      join(root, "components/life-lab/life-lab-learning-map-compact.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );

    assert.match(noteContent, /LifeLabLearningMapCompact/);
    assert.match(noteContent, /learning-map-first/);
    assert.match(compact, /Open full map/);
    assert.match(compact, /MermaidDiagramDialog/);
    assert.match(compact, /data-life-lab-learning-map="compact"/);
    assert.match(page, /LifeLabNoteImageFigure/);
    assert.match(page, /LifeLabNoteContent/);
    const imageIndex = page.indexOf("LifeLabNoteImageFigure");
    const contentIndex = page.indexOf("<LifeLabNoteContent");
    assert.ok(imageIndex >= 0 && contentIndex > imageIndex);
  });
});
