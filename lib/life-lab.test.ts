import { readFileSync } from "node:fs";
import { join } from "node:path";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  driveFilenameToSlug,
  driveRelativePathToSlug,
  formatDateLabelFromFilename,
  isReadmeRelativePath,
  isReadmeSlug,
  markdownExcerpt,
  parseDateFromFilename,
  relativePathSubfolder,
  slugToRelativePath,
  slugToTitle,
  titleFromFilename,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";
import { groupDisclosureSummary, groupLifeLabNotes } from "@/lib/life-lab/organization";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import {
  collectLifeLabFilterOptions,
  filterLifeLabNotes,
} from "@/lib/life-lab/filters";
import { processLifeLabNoteContent } from "@/lib/life-lab/enrichment";
import {
  isRedundantMetadataChip,
  selectVisibleMetadataChips,
} from "@/lib/life-lab/metadata-chips";
import {
  noteShowsFlashcardAction,
  resolveStudyStatusLabel,
  studyStatusLabel,
} from "@/lib/life-lab/study-status";
import {
  chunkSpeechText,
  DEFAULT_SPEECH_LANG,
  DEFAULT_SPEECH_RATE,
  detectSpeechBrowserNameFromUserAgent,
  findSpeechVoiceById,
  findSelectableSpeechVoiceById,
  getSpeechVoiceId,
  listEnglishSpeechVoices,
  listSelectableSpeechVoices,
  markdownToSpeechText,
  pickSpeechVoice,
  plainTextToSpeechText,
  prepareFlashcardSpeechText,
  prepareNoteSpeechText,
  resolveSpeechVoice,
  SPEECH_AUTO_VOICE_ID,
  SPEECH_BROWSER_FALLBACK_MESSAGE,
  SPEECH_RATE_OPTIONS,
  SPEECH_VOICE_SELECTION_FALLBACK_MESSAGE,
} from "@/lib/life-lab/speech";
import {
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { prepareMermaidSvg, mermaidSvgHasVisibleContent } from "@/lib/life-lab/mermaid-svg";
import { getMermaidInitializeOptions } from "@/lib/life-lab/mermaid-config";
import { isMarkdownDriveFile } from "@/lib/life-lab/google-drive";
import {
  lifeLabFolderEntriesToMap,
  normalizeLifeLabFolderMapResult,
  resolveLifeLabFolderMap,
} from "@/lib/life-lab";
import { canUseLifeLabFeatures, canAccessLifeLabPage } from "@/lib/roles";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";

function noteSummary(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  const relativePath =
    partial.relativePath ??
    (partial.slug.includes("__")
      ? `${partial.slug.split("__").join("/")}.md`
      : `${partial.slug}.md`);

  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: null,
    fileId: partial.fileId ?? `file-${partial.slug}`,
    relativePath,
    ...partial,
  };
}

describe("life lab folder map handling", () => {
  it("reconstructs a Map from cached entries", () => {
    const folderMap = lifeLabFolderEntriesToMap([
      ["youtube-learning", "folder-1"],
      ["photography", "folder-2"],
    ]);

    assert.equal(folderMap.get("youtube-learning"), "folder-1");
    assert.equal(folderMap.get("photography"), "folder-2");
  });

  it("normalizes successful cache payloads", () => {
    const result = normalizeLifeLabFolderMapResult({
      ok: true,
      entries: [["art-history", "folder-3"]],
    });

    assert.equal(result?.ok, true);
    assert.deepEqual(
      resolveLifeLabFolderMap(result)?.get("art-history"),
      "folder-3",
    );
  });

  it("normalizes failed cache payloads without throwing", () => {
    const result = normalizeLifeLabFolderMapResult({
      ok: false,
      error: {
        name: "LifeLabDriveError",
        message: "Google Drive request failed (404).",
      },
    });

    assert.equal(result?.ok, false);
    assert.equal(resolveLifeLabFolderMap(result), null);
  });

  it("rejects invalid cache payloads", () => {
    assert.equal(normalizeLifeLabFolderMapResult(undefined), null);
    assert.equal(normalizeLifeLabFolderMapResult({ ok: true }), null);
    assert.equal(normalizeLifeLabFolderMapResult({}), null);
  });
});

describe("life lab access", () => {
  it("allows Personal users and admins", () => {
    assert.equal(canUseLifeLabFeatures({ role: "PERSONAL" }), true);
    assert.equal(canUseLifeLabFeatures({ role: "ADMIN" }), true);
    assert.equal(canUseLifeLabFeatures({ role: "USER" }), false);
    assert.equal(canUseLifeLabFeatures({ role: "REFLECTOR" }), false);
    assert.equal(
      canUseLifeLabFeatures({
        role: "USER",
        canUseLifeLabFeatures: true,
      }),
      false,
    );
  });

  it("keeps route access aligned with feature access", () => {
    assert.equal(canAccessLifeLabPage({ role: "PERSONAL" }), true);
    assert.equal(canAccessLifeLabPage({ role: "ADMIN" }), true);
    assert.equal(canAccessLifeLabPage({ role: "USER" }), false);
    assert.equal(canAccessLifeLabPage({ role: "REFLECTOR" }), false);
  });
});

describe("life lab sections", () => {
  it("allows only configured public sections", () => {
    assert.equal(isLifeLabSectionId("youtube-learning"), true);
    assert.equal(isLifeLabSectionId("photography"), true);
    assert.equal(isLifeLabSectionId("reading-briefs"), true);
    assert.equal(isLifeLabSectionId("therapy-prep"), false);
  });

  it("blocks private section ids explicitly", () => {
    assert.equal(isLifeLabSectionBlocked("therapy-prep"), true);
    assert.equal(isLifeLabSectionBlocked("health-notes"), true);
    assert.equal(isLifeLabSectionBlocked("youtube-learning"), false);
  });

  it("maps allowed folder names to section ids", () => {
    assert.equal(sectionIdFromFolderName("art-history"), "art-history");
    assert.equal(sectionIdFromFolderName("reading-briefs"), "reading-briefs");
    assert.equal(sectionIdFromFolderName("therapy-prep"), null);
  });
});

describe("life lab slug helpers", () => {
  it("converts markdown filenames to slugs", () => {
    assert.equal(
      driveFilenameToSlug("2026-07-02 Renaissance Notes.md"),
      "2026-07-02-renaissance-notes",
    );
  });

  it("converts nested relative paths to reversible slugs", () => {
    assert.equal(
      driveRelativePathToSlug("videos/2026-07-04-bplus-bush-gulf-war.md"),
      "videos__2026-07-04-bplus-bush-gulf-war",
    );
    assert.equal(
      slugToRelativePath("videos__2026-07-04-bplus-bush-gulf-war"),
      "videos/2026-07-04-bplus-bush-gulf-war.md",
    );
    assert.equal(
      driveRelativePathToSlug(
        "videos/2026-07-05-rest-is-history-benjamin-franklin.md",
      ),
      "videos__2026-07-05-rest-is-history-benjamin-franklin",
    );
  });

  it("extracts subfolder labels from relative paths", () => {
    assert.equal(
      relativePathSubfolder("videos/2026-07-04-bplus-bush-gulf-war.md"),
      "videos",
    );
    assert.equal(relativePathSubfolder("README.md"), null);
  });

  it("detects README notes", () => {
    assert.equal(isReadmeRelativePath("README.md"), true);
    assert.equal(isReadmeSlug("readme"), true);
    assert.equal(isReadmeSlug("videos__2026-07-04-bplus-bush-gulf-war"), false);
  });

  it("derives titles without date prefixes", () => {
    assert.equal(slugToTitle("renaissance-notes"), "Renaissance Notes");
    assert.equal(
      titleFromFilename("2026-07-04-bplus-bush-gulf-war.md"),
      "Bplus Bush Gulf War",
    );
    assert.equal(
      slugToTitle("videos__2026-07-04-bplus-bush-gulf-war"),
      "Bplus Bush Gulf War",
    );
    assert.equal(titleFromFilename("channels.md"), "Channels");
  });

  it("formats date labels from filenames", () => {
    assert.equal(
      formatDateLabelFromFilename("2026-07-04-bplus-bush-gulf-war.md"),
      "Jul 4, 2026",
    );
  });

  it("parses date prefixes from filenames", () => {
    assert.equal(
      parseDateFromFilename("2026-07-02-note.md"),
      "2026-07-02",
    );
  });

  it("creates short markdown excerpts", () => {
    assert.equal(
      markdownExcerpt("# Heading\n\nA **short** note about art."),
      "Heading A short note about art.",
    );
  });

  it("extracts titles from leading markdown headings", () => {
    assert.equal(
      titleFromMarkdownHeading("# Reading Brief: July 4\n\nWhat I read…"),
      "Reading Brief: July 4",
    );
    assert.equal(
      titleFromMarkdownHeading("\n\n## Main stories ##\ntext"),
      "Main stories",
    );
    assert.equal(titleFromMarkdownHeading("Plain text first\n# Later"), null);
    assert.equal(titleFromMarkdownHeading(""), null);
  });
});

describe("life lab note organization", () => {
  it("groups video notes first with collapsed reference and about sections", () => {
    const groups = groupLifeLabNotes([
      noteSummary({
        slug: "readme",
        title: "Readme",
        relativePath: "README.md",
      }),
      noteSummary({
        slug: "channels",
        title: "Channels",
        relativePath: "channels.md",
      }),
      noteSummary({
        slug: "videos__2026-07-05-rest-is-history-benjamin-franklin",
        title: "Rest Is History Benjamin Franklin",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-05-rest-is-history-benjamin-franklin.md",
        dateLabel: "Jul 5, 2026",
      }),
      noteSummary({
        slug: "videos__2026-07-04-bplus-bush-gulf-war",
        title: "Bplus Bush Gulf War",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-04-bplus-bush-gulf-war.md",
        dateLabel: "Jul 4, 2026",
      }),
      noteSummary({
        slug: "concepts",
        title: "Concepts",
        relativePath: "concepts.md",
      }),
      noteSummary({
        slug: "questions",
        title: "Questions",
        relativePath: "questions.md",
      }),
    ]);

    assert.deepEqual(
      groups.map((group) => group.label),
      ["Videos", "Reference", "About this section"],
    );
    assert.equal(groups[0]?.variant, "primary");
    assert.equal(groups[0]?.collapsedByDefault, false);
    assert.equal(groups[1]?.variant, "disclosure");
    assert.equal(groups[1]?.collapsedByDefault, true);
    assert.equal(groups[2]?.label, "About this section");
    assert.deepEqual(
      groups[0]?.notes.map((note) => note.title),
      [
        "Rest Is History Benjamin Franklin",
        "Bplus Bush Gulf War",
      ],
    );
    assert.deepEqual(
      groups[1]?.notes.map((note) => note.title),
      ["Channels", "Concepts", "Questions"],
    );
  });

  it("dedupes duplicate file ids using videos over archive priority", () => {
    const groups = groupLifeLabNotes([
      noteSummary({
        slug: "archive__2026-07-04-bplus-bush-gulf-war",
        title: "Archived copy",
        subfolderLabel: "archive",
        fileId: "shared-file",
        relativePath: "archive/2026-07-04-bplus-bush-gulf-war.md",
      }),
      noteSummary({
        slug: "videos__2026-07-04-bplus-bush-gulf-war",
        title: "Bplus Bush Gulf War",
        subfolderLabel: "videos",
        fileId: "shared-file",
        relativePath: "videos/2026-07-04-bplus-bush-gulf-war.md",
      }),
    ]);

    assert.deepEqual(groups.map((group) => group.label), ["Videos"]);
    assert.equal(groups[0]?.notes.length, 1);
    assert.equal(groups[0]?.notes[0]?.title, "Bplus Bush Gulf War");
  });

  it("groups reading briefs with daily and saved-articles first", () => {
    const groups = groupLifeLabNotes([
      noteSummary({
        slug: "readme",
        title: "Readme",
        relativePath: "README.md",
      }),
      noteSummary({
        slug: "sources",
        title: "Sources",
        relativePath: "sources.md",
      }),
      noteSummary({
        slug: "interests",
        title: "Interests",
        relativePath: "interests.md",
      }),
      noteSummary({
        slug: "daily__2026-07-04-brief",
        title: "Brief",
        subfolderLabel: "daily",
        relativePath: "daily/2026-07-04-brief.md",
        dateLabel: "Jul 4, 2026",
      }),
      noteSummary({
        slug: "saved-articles__2026-07-03-essay",
        title: "Essay",
        subfolderLabel: "saved-articles",
        relativePath: "saved-articles/2026-07-03-essay.md",
        dateLabel: "Jul 3, 2026",
      }),
    ]);

    assert.deepEqual(
      groups.map((group) => group.id),
      ["daily", "saved-articles", "reference", "about"],
    );
    assert.equal(groups[0]?.variant, "primary");
    assert.equal(groups[1]?.variant, "primary");
    assert.equal(groups[2]?.collapsedByDefault, true);
    assert.equal(groups[3]?.collapsedByDefault, true);
    assert.deepEqual(
      groups[2]?.notes.map((note) => note.title),
      ["Interests", "Sources"],
    );
  });

  it("formats disclosure summaries with note counts", () => {
    assert.equal(
      groupDisclosureSummary({
        id: "reference",
        label: "Reference",
        notes: [
          noteSummary({ slug: "channels", title: "Channels" }),
          noteSummary({ slug: "concepts", title: "Concepts" }),
          noteSummary({ slug: "questions", title: "Questions" }),
        ],
        collapsedByDefault: true,
        variant: "disclosure",
      }),
      "Reference · 3 notes",
    );
  });
});

describe("life lab dev tools", () => {
  it("enables dev tools only in development", () => {
    assert.equal(isLifeLabDevToolsEnabled(), process.env.NODE_ENV === "development");
  });
});

describe("life lab mermaid sizing", () => {
  it("expands undersized svg dimensions while preserving viewBox", () => {
    const prepared = prepareMermaidSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 640 120"><text>Map</text></svg>',
    );

    assert.match(prepared.html, /viewBox=["']0 0 640 120["']/);
    assert.match(prepared.html, /width=["']640["']/);
    assert.match(prepared.html, /height=["']120["']/);
    assert.doesNotMatch(prepared.html, /style=/);
    assert.equal(prepared.minWidth, 640);
  });

  it("detects visible mermaid node content", () => {
    assert.equal(
      mermaidSvgHasVisibleContent(
        '<svg viewBox="0 0 10 10"><g class="node"><rect/><text>Hi</text></g></svg>',
      ),
      true,
    );
    assert.equal(
      mermaidSvgHasVisibleContent('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>'),
      false,
    );
  });

  it("uses theme-aware mermaid colors", () => {
    assert.equal(getMermaidInitializeOptions("dark").theme, "dark");
    assert.equal(
      getMermaidInitializeOptions("dark").themeVariables.primaryTextColor,
      "#f4efe8",
    );
    assert.equal(getMermaidInitializeOptions("light").theme, "base");
    assert.equal(
      getMermaidInitializeOptions("light").themeVariables.primaryColor,
      "#f8f5ef",
    );
  });
});

describe("life lab markdown file filter", () => {
  it("accepts markdown and plain text files ending in .md", () => {
    assert.equal(
      isMarkdownDriveFile({
        id: "1",
        name: "note.md",
        mimeType: "text/markdown",
      }),
      true,
    );
    assert.equal(
      isMarkdownDriveFile({
        id: "2",
        name: "note.md",
        mimeType: "text/plain",
      }),
      true,
    );
  });

  it("rejects non-markdown files", () => {
    assert.equal(
      isMarkdownDriveFile({
        id: "3",
        name: "sheet.pdf",
        mimeType: "application/pdf",
      }),
      false,
    );
  });
});

const sampleFrontmatterNote = readFileSync(
  join(process.cwd(), "lib/life-lab/fixtures/sample-frontmatter-note.md"),
  "utf8",
);

describe("life lab frontmatter", () => {
  it("parses optional yaml frontmatter and strips it from the body", () => {
    const parsed = parseLifeLabFrontmatter(sampleFrontmatterNote);

    assert.equal(parsed.metadata.channel, "Lessons from the Past");
    assert.equal(parsed.metadata.playlist, "The Iranian Revolution");
    assert.deepEqual(parsed.metadata.tags, ["history", "iran", "revolution"]);
    assert.equal(parsed.metadata.flashcards, true);
    assert.equal(parsed.metadata.reviewed, false);
    assert.match(parsed.body, /^# The Shah's Last Stand/);
    assert.doesNotMatch(parsed.body, /^---/);
  });

  it("falls back to the original content when frontmatter is missing", () => {
    const content = "# Plain note\n\nNo frontmatter here.";
    const parsed = parseLifeLabFrontmatter(content);

    assert.deepEqual(parsed.metadata, {});
    assert.equal(parsed.body, content);
  });
});

describe("life lab flashcards", () => {
  it("extracts Q/A cards from an Optional Flashcards section", () => {
    const { body } = parseLifeLabFrontmatter(sampleFrontmatterNote);
    const cards = extractFlashcardsFromMarkdown(body);

    assert.equal(cards.length, 3);
    assert.match(cards[0]?.question ?? "", /Franklin/i);
    assert.match(cards[1]?.answer ?? "", /accepted right/i);
    assert.match(cards[2]?.question ?? "", /Mohammad Reza Shah/i);
  });
});

describe("life lab search and filters", () => {
  it("finds notes by title, body text, tag, topic, person, and playlist", () => {
    const processed = processLifeLabNoteContent(
      noteSummary({
        slug: "videos__iran-revolution",
        title: "Iran Revolution",
        subfolderLabel: "videos",
        relativePath: "videos/iran-revolution.md",
      }),
      sampleFrontmatterNote,
    );

    assert.equal(noteMatchesSearch(processed, "iran"), true);
    assert.equal(noteMatchesSearch(processed, "Khomeini"), true);
    assert.equal(noteMatchesSearch(processed, "Iranian Revolution"), true);
    assert.equal(noteMatchesSearch(processed, "Lessons from the Past"), true);
    assert.equal(noteMatchesSearch(processed, "political legitimacy"), true);
    assert.equal(noteMatchesSearch(processed, "missing-term"), false);
  });

  it("filters notes by metadata tags and playlists", () => {
    const notes = [
      noteSummary({
        slug: "one",
        title: "One",
        metadata: { tags: ["history"], playlist: "Series A" },
      }),
      noteSummary({
        slug: "two",
        title: "Two",
        metadata: { tags: ["art"], playlist: "Series B" },
      }),
    ];

    const filtered = filterLifeLabNotes(notes, { tag: "history", playlist: "Series A" });

    assert.deepEqual(filtered.map((note) => note.slug), ["one"]);
    assert.deepEqual(collectLifeLabFilterOptions(notes).playlist, [
      "Series A",
      "Series B",
    ]);
  });
});

describe("life lab metadata grouping", () => {
  it("groups playlist metadata into playlist sections", () => {
    const groups = groupLifeLabNotes([
      noteSummary({
        slug: "videos__episode-1",
        title: "Episode 1",
        subfolderLabel: "videos",
        metadata: { playlist: "The Iranian Revolution" },
      }),
      noteSummary({
        slug: "videos__episode-2",
        title: "Episode 2",
        subfolderLabel: "videos",
        metadata: { playlist: "The Iranian Revolution" },
      }),
      noteSummary({
        slug: "videos__standalone",
        title: "Standalone",
        subfolderLabel: "videos",
      }),
    ]);

    assert.deepEqual(
      groups.map((group) => group.label),
      ["Videos", "The Iranian Revolution"],
    );
    assert.equal(groups[1]?.notes.length, 2);
  });
});

describe("life lab blocked sections", () => {
  it("blocks private folders including conversations and archive", () => {
    assert.equal(isLifeLabSectionBlocked("conversations"), true);
    assert.equal(isLifeLabSectionBlocked("archive"), true);
    assert.equal(isLifeLabSectionBlocked("youtube-learning"), false);
  });
});

describe("life lab metadata chips", () => {
  const franklinMetadata = {
    type: "youtube-learning",
    section: "youtube-learning",
    source: "youtube",
    channel: "Lessons from the Past",
    tags: ["history", "youtube", "diplomacy"],
    topics: ["enlightenment", "diplomacy"],
  };

  it("hides redundant youtube and section chips in YouTube learning", () => {
    const chips = selectVisibleMetadataChips(franklinMetadata, {
      sectionId: "youtube-learning",
      groupId: "videos",
      variant: "card",
    });

    assert.deepEqual(chips.visible, [
      "enlightenment",
      "diplomacy",
      "history",
    ]);
    assert.equal(
      isRedundantMetadataChip("youtube", { sectionId: "youtube-learning" }),
      true,
    );
    assert.equal(
      isRedundantMetadataChip("video", { groupId: "videos" }),
      true,
    );
  });

  it("hides playlist chips inside the matching playlist group", () => {
    const chips = selectVisibleMetadataChips(
      {
        playlist: "The Iranian Revolution",
        tags: ["iran", "revolution", "monarchy"],
        source: "youtube",
      },
      {
        sectionId: "youtube-learning",
        groupId: "playlist:the iranian revolution",
        groupLabel: "The Iranian Revolution",
        variant: "card",
      },
    );

    assert.deepEqual(chips.visible, ["iran", "revolution", "monarchy"]);
  });

  it("shows overflow count when detail chips exceed the visible limit", () => {
    const chips = selectVisibleMetadataChips(
      {
        topics: ["one", "two", "three", "four"],
        tags: ["five", "six", "seven", "eight"],
        people: ["nine"],
      },
      { variant: "detail" },
    );

    assert.equal(chips.visible.length, 8);
    assert.equal(chips.overflowCount, 1);
  });
});

describe("life lab study status", () => {
  it("maps study_status values to readable labels", () => {
    assert.equal(studyStatusLabel("new"), "New");
    assert.equal(studyStatusLabel("learned"), "Learned");
    assert.equal(
      resolveStudyStatusLabel({ study_status: "studying" }),
      "Studying",
    );
  });

  it("falls back to reviewed when study_status is missing", () => {
    assert.equal(resolveStudyStatusLabel({ reviewed: true }), "Reviewed");
    assert.equal(resolveStudyStatusLabel({ reviewed: false }), "New");
  });

  it("prefers study_status over reviewed", () => {
    assert.equal(
      resolveStudyStatusLabel({ study_status: "revisit", reviewed: true }),
      "Revisit",
    );
  });

  it("shows flashcard action only when cards exist", () => {
    assert.equal(
      noteShowsFlashcardAction({ hasFlashcards: true, flashcardCount: 3 }),
      true,
    );
    assert.equal(
      noteShowsFlashcardAction({ hasFlashcards: true, flashcardCount: 0 }),
      false,
    );
    assert.equal(noteShowsFlashcardAction({ hasFlashcards: false }), false);
  });
});

describe("life lab speech", () => {
  it("strips markdown syntax for readable speech text", () => {
    const spoken = markdownToSpeechText(
      "# Heading\n\n[Link](https://example.com)\n\n```mermaid\ngraph LR\n```\n\n```js\nconst x = 1\n```\n\nPlain text.",
    );

    assert.match(spoken, /Heading/);
    assert.match(spoken, /Link/);
    assert.match(spoken, /Plain text/);
    assert.doesNotMatch(spoken, /```/);
    assert.doesNotMatch(spoken, /graph LR/);
    assert.doesNotMatch(spoken, /example\.com/);
  });

  it("reads markdown link text without the URL", () => {
    const spoken = markdownToSpeechText(
      "[BBC article](https://example.com/article)",
    );

    assert.equal(spoken, "BBC article");
  });

  it("removes bare https URLs but keeps the rest of the sentence", () => {
    const spoken = markdownToSpeechText(
      "See https://example.com/article for details.",
    );

    assert.equal(spoken, "See for details.");
  });

  it("removes bare www URLs from speech text", () => {
    const spoken = plainTextToSpeechText(
      "More at www.example.com/article today.",
    );

    assert.equal(spoken, "More at today.");
  });

  it("skips lines that only contain a URL", () => {
    const spoken = markdownToSpeechText(
      "Keep this.\nhttps://example.com/article\nAlso this.",
    );

    assert.equal(spoken, "Keep this. Also this.");
  });

  it("does not read source lines that only contain a URL", () => {
    const spoken = markdownToSpeechText(
      "Intro paragraph.\n\nSource: https://bbc.co.uk/news/article\n\nClosing note.",
    );

    assert.match(spoken, /Intro paragraph/);
    assert.match(spoken, /Closing note/);
    assert.doesNotMatch(spoken, /bbc\.co\.uk/);
    assert.doesNotMatch(spoken, /https?:/);
  });

  it("cleans URLs from flashcard speech text", () => {
    const segments = prepareFlashcardSpeechText({
      question: "What is [BBC article](https://example.com)?",
      answer: "See https://example.com/docs for more.",
      revealed: true,
    });

    assert.deepEqual(segments, [
      "What is BBC article?",
      "See for more.",
    ]);
  });

  it("prepares note speech text with title and cleaned body", () => {
    const spoken = prepareNoteSpeechText("Benjamin Franklin", "## Notes\n\nDiplomat.");

    assert.equal(spoken, "Benjamin Franklin. Notes. Diplomat.");
  });

  it("prefers British English female voices when available", () => {
    const voice = pickSpeechVoice([
      { name: "Alex", lang: "en-US" } as SpeechSynthesisVoice,
      { name: "Daniel", lang: "en-GB" } as SpeechSynthesisVoice,
      { name: "Serena", lang: "en-GB" } as SpeechSynthesisVoice,
    ]);

    assert.equal(voice?.name, "Serena");
  });

  it("prefers Flo over Serena and Daniel for auto voice on Safari", () => {
    const voice = pickSpeechVoice([
      { name: "Daniel", lang: "en-GB", voiceURI: "daniel" } as SpeechSynthesisVoice,
      { name: "Serena", lang: "en-GB", voiceURI: "serena" } as SpeechSynthesisVoice,
      { name: "Flo (English (UK))", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
    ]);

    assert.equal(voice?.name, "Flo (English (UK))");
  });

  it("prefers Google UK English Female for auto voice when available", () => {
    const voice = pickSpeechVoice([
      { name: "Bad News", lang: "en-US", voiceURI: "bad-news" } as SpeechSynthesisVoice,
      { name: "Google UK English Male", lang: "en-GB", voiceURI: "google-uk-male" } as SpeechSynthesisVoice,
      { name: "Google UK English Female", lang: "en-GB", voiceURI: "google-uk-female" } as SpeechSynthesisVoice,
    ]);

    assert.equal(voice?.name, "Google UK English Female");
  });

  it("deprioritizes Daniel among en-GB voices", () => {
    const voice = pickSpeechVoice([
      { name: "Daniel", lang: "en-GB", voiceURI: "daniel" } as SpeechSynthesisVoice,
      { name: "Arthur", lang: "en-GB", voiceURI: "arthur" } as SpeechSynthesisVoice,
    ]);

    assert.equal(voice?.name, "Arthur");
  });

  it("lists only curated Google English voices for the voice selector", () => {
    const voices = listSelectableSpeechVoices([
      { name: "Bad News", lang: "en-US", voiceURI: "bad-news" } as SpeechSynthesisVoice,
      { name: "Bubbles", lang: "en-US", voiceURI: "bubbles" } as SpeechSynthesisVoice,
      { name: "Google UK English Female", lang: "en-GB", voiceURI: "google-uk-female" } as SpeechSynthesisVoice,
      { name: "Google UK English Male", lang: "en_GB", voiceURI: "google-uk-male" } as SpeechSynthesisVoice,
      { name: "Google US English", lang: "en-US", voiceURI: "google-us" } as SpeechSynthesisVoice,
      { name: "Flo", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
    ]);

    assert.deepEqual(
      voices.map((voice) => voice.label),
      [
        "Google UK English Female (en-gb)",
        "Google UK English Male (en-gb)",
        "Google US English (en-us)",
      ],
    );
    assert.equal(listEnglishSpeechVoices([
      { name: "Bad News", lang: "en-US", voiceURI: "bad-news" } as SpeechSynthesisVoice,
      { name: "Google US English", lang: "en-US", voiceURI: "google-us" } as SpeechSynthesisVoice,
    ]).length, 1);
  });

  it("lists clean Safari English voices when Google voices are unavailable", () => {
    const voices = listSelectableSpeechVoices([
      { name: "Bad News", lang: "en-US", voiceURI: "bad-news" } as SpeechSynthesisVoice,
      { name: "Grandma", lang: "en-US", voiceURI: "grandma" } as SpeechSynthesisVoice,
      { name: "Flo", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
      { name: "Serena", lang: "en-GB", voiceURI: "serena" } as SpeechSynthesisVoice,
      { name: "Thomas", lang: "fr-FR", voiceURI: "thomas" } as SpeechSynthesisVoice,
    ]);

    assert.deepEqual(
      voices.map((voice) => voice.label),
      ["Flo (en-gb)", "Serena (en-gb)"],
    );
    assert.equal(
      resolveSpeechVoice(
        [
          { name: "Flo", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
          { name: "Serena", lang: "en-GB", voiceURI: "serena" } as SpeechSynthesisVoice,
        ],
        getSpeechVoiceId({ name: "Serena", lang: "en-GB", voiceURI: "serena" } as SpeechSynthesisVoice),
      )?.name,
      "Serena",
    );
  });

  it("filters novelty Safari voices from the dropdown", () => {
    const voices = listSelectableSpeechVoices([
      { name: "Albert", lang: "en-US", voiceURI: "albert" } as SpeechSynthesisVoice,
      { name: "Bahh", lang: "en-US", voiceURI: "bahh" } as SpeechSynthesisVoice,
      { name: "Junior", lang: "en-US", voiceURI: "junior" } as SpeechSynthesisVoice,
      { name: "Ralph", lang: "en-US", voiceURI: "ralph" } as SpeechSynthesisVoice,
      { name: "Wobble", lang: "en-US", voiceURI: "wobble" } as SpeechSynthesisVoice,
      { name: "Daniel", lang: "en-GB", voiceURI: "daniel" } as SpeechSynthesisVoice,
      { name: "Fred", lang: "en-US", voiceURI: "fred" } as SpeechSynthesisVoice,
      { name: "Karen", lang: "en-AU", voiceURI: "karen" } as SpeechSynthesisVoice,
      { name: "Moira", lang: "en-IE", voiceURI: "moira" } as SpeechSynthesisVoice,
      { name: "Samantha", lang: "en-US", voiceURI: "samantha" } as SpeechSynthesisVoice,
    ]);

    assert.deepEqual(
      voices.map((voice) => voice.label),
      [
        "Daniel (en-gb)",
        "Fred (en-us)",
        "Karen (en-au)",
        "Moira (en-ie)",
        "Samantha (en-us)",
      ],
    );
    assert.equal(
      findSelectableSpeechVoiceById(
        [{ name: "Albert", lang: "en-US", voiceURI: "albert" } as SpeechSynthesisVoice],
        "albert",
      ),
      null,
    );
  });

  it("returns no selectable voices when only novelty voices are available", () => {
    const voices = listSelectableSpeechVoices([
      { name: "Albert", lang: "en-US", voiceURI: "albert" } as SpeechSynthesisVoice,
      { name: "Bahh", lang: "en-US", voiceURI: "bahh" } as SpeechSynthesisVoice,
      { name: "Wobble", lang: "en-US", voiceURI: "wobble" } as SpeechSynthesisVoice,
    ]);

    assert.deepEqual(voices, []);
  });

  it("resolves manual and auto voice selections", () => {
    const voices = [
      { name: "Google UK English Female", lang: "en-GB", voiceURI: "google-uk-female" } as SpeechSynthesisVoice,
      { name: "Google US English", lang: "en-US", voiceURI: "google-us" } as SpeechSynthesisVoice,
    ];

    assert.equal(
      resolveSpeechVoice(voices, SPEECH_AUTO_VOICE_ID)?.name,
      "Google UK English Female",
    );
    assert.equal(
      resolveSpeechVoice(voices, "google-us-english")?.name,
      "Google US English",
    );
    assert.equal(findSpeechVoiceById(voices, "missing"), null);
    assert.equal(resolveSpeechVoice(voices, "google-uk-english-female")?.name, "Google UK English Female");
  });

  it("uses en-GB lang hint without assigning a voice by default", () => {
    assert.equal(DEFAULT_SPEECH_LANG, "en-GB");
  });

  it("includes 0.9x speech rate and uses it as the default", () => {
    assert.deepEqual(SPEECH_RATE_OPTIONS, [0.8, 0.9, 1, 1.2]);
    assert.equal(DEFAULT_SPEECH_RATE, 0.9);
  });

  it("chunks long note text into readable segments", () => {
    const longText = `${"Word. ".repeat(400)}End.`;
    const chunks = chunkSpeechText(longText, 1000);

    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => chunk.length <= 1000));
    assert.match(chunks.join(" "), /^Word\./);
    assert.match(chunks.at(-1) ?? "", /End\.$/);
  });

  it("detects common browser names from user agent strings", () => {
    assert.equal(
      detectSpeechBrowserNameFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
      "Safari",
    );
    assert.equal(
      detectSpeechBrowserNameFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
      "Chrome",
    );
  });

  it("includes a calm browser fallback message for speech failures", () => {
    assert.match(SPEECH_BROWSER_FALLBACK_MESSAGE, /Safari on macOS/);
    assert.match(SPEECH_BROWSER_FALLBACK_MESSAGE, /may not work/);
    assert.match(SPEECH_VOICE_SELECTION_FALLBACK_MESSAGE, /Auto/);
  });
});
