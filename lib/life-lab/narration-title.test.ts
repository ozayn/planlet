import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSectionNarrationSpeechText,
  buildReadAloudPlaybackPlan,
} from "@/lib/life-lab/narration-chunks";
import { NARRATION_INSTRUCTION_VERSION } from "@/lib/life-lab/narration-config";
import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  isSameNarrationTitle,
  normalizeNarrationTitle,
} from "@/lib/life-lab/narration-title";
import {
  buildReadAloudSections,
  stripMatchingDocumentTitleHeading,
} from "@/lib/life-lab/read-aloud-sections";
import {
  buildCoachingReadAloudPlaybackPlan,
  buildCoachingReadAloudSections,
} from "@/lib/coaching/read-aloud-sections";
import { COACHING_NARRATION_INSTRUCTION_VERSION } from "@/lib/coaching/narration-config";
import { getNoteNarrationContentHash } from "@/lib/life-lab/narration-service";

describe("narration title matching", () => {
  it("matches equivalent titles after normalization", () => {
    assert.equal(
      isSameNarrationTitle(
        "Arguments for the Soul, Part I",
        "# Arguments for the Soul, Part I",
      ),
      true,
    );
    assert.equal(
      normalizeNarrationTitle("Death with Shelly Kagan — Playlist Summary"),
      normalizeNarrationTitle("Death with Shelly Kagan - Playlist Summary"),
    );
    assert.equal(
      isSameNarrationTitle(
        "Death with Shelly Kagan",
        "Death with Shelly Kagan — Playlist Summary",
      ),
      true,
    );
  });

  it("does not collapse materially different headings", () => {
    assert.equal(
      isSameNarrationTitle("Western Philosophy", "Playlist Summary"),
      false,
    );
  });
});

describe("document title spoken once", () => {
  const note = {
    title: "Arguments for the Soul, Part I",
    content: [
      "# Arguments for the Soul, Part I",
      "",
      "## Short version",
      "A quick overview of dualism.",
      "",
      "## Summary",
      "Descartes presents several arguments.",
    ].join("\n"),
  };

  it("speaks matching page title + H1 only once", () => {
    const sections = buildReadAloudSections(note);
    const titleSections = sections.filter(
      (section) => section.category === "NOTE_TITLE",
    );

    assert.equal(titleSections.length, 1);
    assert.equal(titleSections[0]?.title, "Arguments for the Soul, Part I");
    assert.equal(titleSections[0]?.text, "");
    assert.equal(
      sections.filter((section) =>
        isSameNarrationTitle(section.title, note.title),
      ).length,
      1,
    );
    assert.equal(
      sections.some((section) => section.title === "Title"),
      false,
    );

    const plan = buildReadAloudPlaybackPlan(sections);
    const spokenTitles = plan.chunks.filter((chunk) =>
      isSameNarrationTitle(chunk.text, note.title),
    );

    assert.equal(spokenTitles.length, 1);
    assert.equal(spokenTitles[0]?.text, "Arguments for the Soul, Part I");
    assert.doesNotMatch(
      plan.chunks.map((chunk) => chunk.text).join(" || "),
      /Arguments for the Soul, Part I\.\s*Arguments for the Soul, Part I/,
    );
  });

  it("strips matching leading H1 from body sections", () => {
    const stripped = stripMatchingDocumentTitleHeading(
      note.content,
      note.title,
    );

    assert.doesNotMatch(stripped.content, /^#\s+Arguments/m);
    assert.match(stripped.content, /## Short version/);
  });

  it("preserves a different first H1", () => {
    const sections = buildReadAloudSections({
      title: "Western Philosophy",
      content: [
        "# Playlist Summary",
        "",
        "Overview of the series.",
        "",
        "## Key ideas",
        "Virtue and habit.",
      ].join("\n"),
    });

    assert.equal(sections[0]?.category, "NOTE_TITLE");
    assert.equal(sections[0]?.title, "Western Philosophy");
    assert.ok(
      sections.some((section) => section.title === "Playlist Summary"),
    );
  });

  it("Device Voice and OpenAI plans share section ids and order", () => {
    const sections = buildReadAloudSections(note);
    const plan = buildReadAloudPlaybackPlan(sections);

    assert.deepEqual(
      plan.sections.map((section) => section.id),
      sections.map((section) => section.id),
    );
    assert.deepEqual(
      plan.sectionChunkRanges.map((range) => range.sectionId),
      sections.map((section) => section.id),
    );
  });

  it("does not use a generic Title label in the section model", () => {
    const sections = buildReadAloudSections(note);
    const plan = buildReadAloudPlaybackPlan(sections);

    assert.equal(
      sections.some((section) => section.title === "Title"),
      false,
    );
    assert.equal(
      plan.sectionChunkRanges.some((range) => range.sectionTitle === "Title"),
      false,
    );
  });

  it("invalidates old duplicated cache via content hash and instruction version", () => {
    assert.ok(NARRATION_INSTRUCTION_VERSION >= 4);

    const improvedHash = getNoteNarrationContentHash(note);
    const duplicatedLegacySpeech = [
      "title-section:Arguments for the Soul, Part I. Arguments for the Soul, Part I",
      "short-version:Short version. A quick overview of dualism.",
    ].join("\n");
    const legacyHash = hashNarrationContent(duplicatedLegacySpeech);

    assert.notEqual(improvedHash, legacyHash);

    const keyV3 = buildNarrationCacheKey({
      driveFileId: "file-1",
      noteModifiedTime: null,
      contentHash: improvedHash,
      provider: "openai",
      model: "gpt-4o-mini-tts",
      voice: "fable",
      narrationStyle: "BRITISH_FEMALE_CALM",
      readAloudSectionId: "all",
      instructionsFingerprint: "fp",
      instructionVersion: 3,
      chunkIndex: 0,
    });
    const keyV4 = buildNarrationCacheKey({
      driveFileId: "file-1",
      noteModifiedTime: null,
      contentHash: improvedHash,
      provider: "openai",
      model: "gpt-4o-mini-tts",
      voice: "fable",
      narrationStyle: "BRITISH_FEMALE_CALM",
      readAloudSectionId: "all",
      instructionsFingerprint: "fp",
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      chunkIndex: 0,
    });

    assert.notEqual(keyV3, keyV4);
  });

  it("builds NOTE_TITLE speech without repeating the title string", () => {
    assert.equal(
      buildSectionNarrationSpeechText({
        title: "Arguments for the Soul, Part I",
        text: "Arguments for the Soul, Part I",
        category: "NOTE_TITLE",
      }),
      "Arguments for the Soul, Part I",
    );
    assert.equal(
      buildSectionNarrationSpeechText({
        title: "Arguments for the Soul, Part I",
        text: "",
        category: "NOTE_TITLE",
      }),
      "Arguments for the Soul, Part I",
    );
  });
});

describe("coaching narration title", () => {
  it("speaks each coaching section title once", () => {
    assert.ok(COACHING_NARRATION_INSTRUCTION_VERSION >= 2);

    const content = {
      reflection: "You have been steady with morning planning.",
      question: "What felt most useful this week?",
      experiment: "Try a five-minute evening review.",
    };

    const sections = buildCoachingReadAloudSections(content);
    const plan = buildCoachingReadAloudPlaybackPlan(content);

    assert.deepEqual(
      plan.sections.map((section) => section.id),
      sections.map((section) => section.id),
    );

    for (const section of plan.sections) {
      const speech = buildSectionNarrationSpeechText(section);
      const titleCount = speech.split(section.title).length - 1;
      assert.equal(titleCount, 1);
    }

    assert.equal(
      sections.some((section) => section.title === "Title"),
      false,
    );
  });
});
