import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import {
  extractLectureNotePreview,
  isLectureNote,
  isLectureNotesCollapsibleSectionTitle,
  isZoomTranscriptNote,
  lectureNoteSemanticTags,
  lectureNoteSourceLabel,
  shouldIncludeLectureNoteInPlanlet,
} from "@/lib/life-lab/lecture-notes";
import { selectVisibleMetadataChips } from "@/lib/life-lab/metadata-chips";
import {
  buildLifeLabNoteContentBlocks,
  listRenderedVisibleSectionTitles,
} from "@/lib/life-lab/note-content-blocks";
import { processLifeLabNoteContent } from "@/lib/life-lab/enrichment";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import { titleFromMarkdownHeading } from "@/lib/life-lab/slug";
import { resolveTextDirection } from "@/lib/text-direction";
import {
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
  getLifeLabSectionLabel,
} from "@/lib/life-lab/sections";

const SAMPLE_AUDIO_NOTE = [
  "---",
  "type: audio-note",
  "source: audio",
  "input_source: telegram",
  "language: English",
  "transcript_available: true",
  "date: 2026-07-10",
  "topics:",
  "  - Attention",
  "  - Habits",
  "  - Reflection",
  "  - Extra topic",
  "tags:",
  "  - audio-note",
  "---",
  "",
  "# Morning voice memo",
  "",
  "## Observations",
  "",
  "Raw observations from the recording.",
  "",
  "## Short version",
  "",
  "A calm summary of the main idea.",
  "",
  "## Transcript notes",
  "",
  "Clarify names mentioned in the audio.",
  "",
  "## Full transcript",
  "",
  "0:00 This is the spoken opening.",
  "",
  "0:40 More spoken detail that should stay off the card preview.",
  "",
  "## Optional Flashcards",
  "",
  "Q: What helps attention? A: A short pause before the next task.",
].join("\n");

const SAMPLE_ZOOM_NOTE = [
  "---",
  "input_source: zoom",
  "source: transcript",
  "speaker_count: 3",
  "language: English",
  "privacy: private",
  "date: 2026-07-12",
  "topics:",
  "  - Systems",
  "  - Feedback",
  "  - Zoom",
  "tags:",
  "  - transcript",
  "---",
  "",
  "# Team sync",
  "",
  "## Short version",
  "",
  "Agree on one small experiment for the week.",
  "",
  "## Full transcript / original notes",
  "",
  "Speaker 1: Let's start with the agenda.",
  "",
  "Speaker 2: I can take notes.",
].join("\n");

const SAMPLE_PERSIAN_LECTURE_NOTE = [
  "---",
  "type: audio-note",
  "source: audio",
  "input_source: telegram",
  "language: Persian",
  "transcript_available: true",
  "date: 2026-07-11",
  "topics:",
  "  - توجه",
  "  - عادت",
  "---",
  "",
  "# خلاصه جلسه صبح",
  "",
  "## Short version",
  "",
  "یک خلاصه کوتاه دربارهٔ تمرکز و habits.",
  "",
  "- نکتهٔ اول دربارهٔ توجه",
  "- نکتهٔ دوم about mixed English",
  "",
  "## Full transcript",
  "",
  "این بخش نباید در کارت دیده شود.",
  "",
  "## Optional Flashcards",
  "",
  "Q: چه چیزی به توجه کمک می‌کند؟",
  "A: یک مکث کوتاه قبل از کار بعدی.",
  "",
  "Q: What is the Persian word for habit? A: عادت",
].join("\n");

describe("lecture notes section", () => {
  it("registers Lecture Notes as an allowed Life Lab section", () => {
    assert.equal(isLifeLabSectionId("lecture-notes"), true);
    assert.equal(sectionIdFromFolderName("lecture-notes"), "lecture-notes");
    assert.equal(getLifeLabSectionLabel("lecture-notes"), "Lecture Notes");
    assert.equal(isLifeLabSectionBlocked("lecture-notes"), false);
    assert.equal(isLifeLabSectionBlocked("therapy-prep"), true);
    assert.equal(sectionIdFromFolderName("therapy-prep"), null);
  });

  it("parses audio-note frontmatter fields", () => {
    const { metadata } = parseLifeLabFrontmatter(SAMPLE_AUDIO_NOTE);

    assert.equal(metadata.type, "audio-note");
    assert.equal(metadata.source, "audio");
    assert.equal(metadata.input_source, "telegram");
    assert.equal(metadata.language, "English");
    assert.equal(metadata.transcript_available, true);
    assert.deepEqual(metadata.topics?.slice(0, 3), [
      "Attention",
      "Habits",
      "Reflection",
    ]);
  });

  it("parses Zoom transcript frontmatter and labels the source", () => {
    const { metadata } = parseLifeLabFrontmatter(SAMPLE_ZOOM_NOTE);

    assert.equal(metadata.input_source, "zoom");
    assert.equal(metadata.source, "transcript");
    assert.equal(metadata.speaker_count, 3);
    assert.equal(metadata.privacy, "private");
    assert.equal(
      isZoomTranscriptNote({
        relativePath: "zoom/2026-07-12-team-sync.md",
        metadata,
      }),
      true,
    );
    assert.equal(
      lectureNoteSourceLabel({
        relativePath: "zoom/2026-07-12-team-sync.md",
        metadata,
      }),
      "Zoom transcript",
    );
  });

  it("detects lecture notes and previews Short version, not transcript", () => {
    assert.equal(
      isLectureNote({
        sectionId: "lecture-notes",
        metadata: { type: "audio-note", source: "audio" },
      }),
      true,
    );

    const preview = extractLectureNotePreview(SAMPLE_AUDIO_NOTE);
    assert.match(preview, /calm summary/i);
    assert.doesNotMatch(preview, /spoken opening/i);

    const zoomPreview = extractLectureNotePreview(SAMPLE_ZOOM_NOTE);
    assert.match(zoomPreview, /small experiment/i);
    assert.doesNotMatch(zoomPreview, /Let's start with the agenda/i);

    const processed = processLifeLabNoteContent(
      {
        slug: "morning-voice-memo",
        title: "Morning voice memo",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: null,
        fileId: "file-1",
        relativePath: "2026-07-10-morning-voice-memo.md",
        mimeType: "text/markdown",
        fileSizeBytes: null,
        sectionId: "lecture-notes",
      },
      SAMPLE_AUDIO_NOTE,
    );

    assert.match(processed.excerpt, /calm summary/i);
    assert.doesNotMatch(processed.excerpt, /spoken opening/i);
    assert.equal(processed.flashcardCount, 1);
    assert.equal(processed.metadata?.language, "English");
  });

  it("caps lecture note card chips at 3 semantic tags", () => {
    const { metadata } = parseLifeLabFrontmatter(SAMPLE_AUDIO_NOTE);
    const chips = selectVisibleMetadataChips(metadata, {
      sectionId: "lecture-notes",
      variant: "card",
    });

    assert.deepEqual(chips.visible, ["Attention", "Habits", "Reflection"]);
    assert.equal(chips.overflowCount, 0);
    assert.equal(lectureNoteSemanticTags(metadata).length >= 3, true);
  });

  it("puts Short version first and collapses transcript sections", () => {
    const body = SAMPLE_AUDIO_NOTE.replace(/^---[\s\S]*?---\r?\n?/, "");
    const titles = listRenderedVisibleSectionTitles(body, {
      prioritizeShortVersion: true,
      collapseTranscriptNotes: true,
    });

    assert.equal(titles[0], "Short version");
    assert.ok(titles.includes("Transcript notes"));
    assert.ok(titles.includes("Full transcript"));

    const blocks = buildLifeLabNoteContentBlocks(body, {
      prioritizeShortVersion: true,
      collapseTranscriptNotes: true,
    });

    const shortIndex = blocks.findIndex(
      (block) =>
        block.kind === "markdown" && block.content.includes("## Short version"),
    );
    const observationsIndex = blocks.findIndex(
      (block) =>
        block.kind === "markdown" && block.content.includes("## Observations"),
    );
    const transcriptNotes = blocks.find(
      (block) =>
        block.kind === "transcript" && block.title === "Transcript notes",
    );
    const fullTranscript = blocks.find(
      (block) =>
        block.kind === "transcript" && block.title === "Full transcript",
    );

    assert.ok(shortIndex >= 0);
    assert.ok(observationsIndex >= 0);
    assert.ok(shortIndex < observationsIndex);
    assert.equal(transcriptNotes?.summaryHint, "Show notes");
    assert.equal(fullTranscript?.summaryHint, "Show transcript");
  });

  it("collapses Full transcript / original notes by default", () => {
    assert.equal(
      isLectureNotesCollapsibleSectionTitle("Full transcript / original notes"),
      true,
    );

    const body = SAMPLE_ZOOM_NOTE.replace(/^---[\s\S]*?---\r?\n?/, "");
    const blocks = buildLifeLabNoteContentBlocks(body, {
      prioritizeShortVersion: true,
      collapseTranscriptNotes: true,
    });

    const collapsed = blocks.find(
      (block) =>
        block.kind === "transcript" &&
        block.title === "Full transcript / original notes",
    );

    assert.ok(collapsed);
    assert.equal(collapsed?.kind, "transcript");
  });

  it("shows private Zoom notes in lecture-notes, but not blocked folders", () => {
    const { metadata } = parseLifeLabFrontmatter(SAMPLE_ZOOM_NOTE);

    assert.equal(
      shouldIncludeLectureNoteInPlanlet({
        sectionId: "lecture-notes",
        relativePath: "zoom/2026-07-12-team-sync.md",
        metadata,
      }),
      true,
    );

    assert.equal(
      shouldIncludeLectureNoteInPlanlet({
        sectionId: "lecture-notes",
        relativePath: "private/secret.md",
        metadata,
      }),
      false,
    );

    assert.equal(
      shouldIncludeLectureNoteInPlanlet({
        sectionId: "therapy-prep",
        relativePath: "notes.md",
        metadata,
      }),
      false,
    );
  });

  it("supports Persian titles, RTL detection, search, and flashcards", () => {
    const title = titleFromMarkdownHeading(
      SAMPLE_PERSIAN_LECTURE_NOTE.replace(/^---[\s\S]*?---\r?\n?/, ""),
    );
    assert.equal(title, "خلاصه جلسه صبح");
    assert.equal(resolveTextDirection(title ?? ""), "rtl");
    assert.equal(
      resolveTextDirection("یک خلاصه کوتاه دربارهٔ تمرکز و habits."),
      "rtl",
    );

    const preview = extractLectureNotePreview(SAMPLE_PERSIAN_LECTURE_NOTE);
    assert.match(preview, /تمرکز/);
    assert.doesNotMatch(preview, /نباید در کارت/);

    const cards = extractFlashcardsFromMarkdown(
      SAMPLE_PERSIAN_LECTURE_NOTE.replace(/^---[\s\S]*?---\r?\n?/, ""),
    );
    assert.equal(cards.length, 2);
    assert.match(cards[0]?.question ?? "", /توجه/);
    assert.match(cards[0]?.answer ?? "", /مکث/);
    assert.equal(cards[1]?.answer, "عادت");

    const processed = processLifeLabNoteContent(
      {
        slug: "persian-morning",
        title: "filename fallback",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: null,
        fileId: "file-fa",
        relativePath: "2026-07-11-persian-morning.md",
        mimeType: "text/markdown",
        fileSizeBytes: null,
        sectionId: "lecture-notes",
      },
      SAMPLE_PERSIAN_LECTURE_NOTE,
    );

    assert.equal(processed.title, "خلاصه جلسه صبح");
    assert.equal(noteMatchesSearch(processed, "توجه"), true);
    assert.equal(noteMatchesSearch(processed, "عادت"), true);
    assert.equal(noteMatchesSearch(processed, "habits"), true);
    assert.equal(noteMatchesSearch(processed, "تمرکز"), true);
    assert.equal(noteMatchesSearch(processed, "missing-term"), false);
  });
});
