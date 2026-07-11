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
import { groupDisclosureSummary, groupLifeLabNotes, noteGroupLabel } from "@/lib/life-lab/organization";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import {
  collectLifeLabFilterOptions,
  filterLifeLabNotes,
} from "@/lib/life-lab/filters";
import {
  buildLifeLabHighlights,
  shouldShowLifeLabHighlights,
  sortLifeLabNotes,
} from "@/lib/life-lab/browse";
import {
  buildCardPreview,
  isNoisyCardPreview,
  selectCardPreview,
} from "@/lib/life-lab/card-preview";
import { processLifeLabNoteContent } from "@/lib/life-lab/enrichment";
import {
  assessReadingBriefStructure,
  detectReadingBriefNavSections,
  extractReadingBriefPreview,
  parseSaveWorthySection,
  parseGlanceListItems,
  prepareReadingBriefSegments,
  readingBriefDisplayTitle,
  readingBriefHeadingAnchor,
  READING_BRIEF_INTEREST_TOPICS,
  READING_BRIEF_MIN_FLASHCARDS,
  transformMarkdownTables,
} from "@/lib/life-lab/reading-briefs";
import {
  dictionaryDisplayTitle,
  extractDictionaryDefinition,
  isDictionaryEntryNote,
  resolveDictionaryCategory,
} from "@/lib/life-lab/learning-dictionary";
import {
  buildDictionaryCandidatesCopyPrompt,
  buildDictionaryNoteContentBlocks,
  extractDictionaryCandidatesSection,
  hasDictionaryStudySections,
  summarizeDictionaryCandidates,
} from "@/lib/life-lab/dictionary-candidates";
import {
  classifyFilmLabNoteGroup,
  extractFilmLabPreview,
  isFilmLabExcludedFolder,
  isFilmLabExcludedRelativePath,
  isFilmLabNote,
} from "@/lib/life-lab/film-lab";
import {
  lifeLabNoteDisplayTitle,
  lifeLabNoteDisplayTitleDiffers,
  youtubeVideoDisplayTitle,
} from "@/lib/life-lab/youtube-learning";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import {
  buildPlaylistNavigationFromVideoNotes,
  buildVideoPlaylistNavigation,
  buildYoutubeVideoNoteHref,
  findPlaylistIndexSlugForVideo,
  formatPlaylistProcessingSummary,
  hasPlaylistVideosTable,
  isPlaylistIndexNote,
  isYoutubeVideoNote,
  parsePlaylistIndexNote,
  resolveYoutubeVideoNoteSlug,
  shouldRenderPlaylistIndexUi,
} from "@/lib/life-lab/playlist-index";
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
  decodeDeviceVoiceId,
  DEFAULT_SPEECH_LANG,
  DEFAULT_SPEECH_RATE,
  detectSpeechBrowserNameFromUserAgent,
  encodeDeviceVoiceId,
  findSpeechVoiceById,
  findSelectableSpeechVoiceById,
  formatVoiceUnavailableMessage,
  getSpeechVoiceId,
  listAllDeviceSpeechVoices,
  listEnglishSpeechVoices,
  listSelectableSpeechVoices,
  markdownToSpeechText,
  pickSpeechVoice,
  plainTextToSpeechText,
  prepareFlashcardSpeechText,
  prepareNoteSpeechText,
  resolveDeviceVoiceWithFallback,
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
    assert.equal(isLifeLabSectionId("learning-dictionary"), true);
    assert.equal(isLifeLabSectionId("film-lab"), true);
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
    assert.equal(sectionIdFromFolderName("learning-dictionary"), "learning-dictionary");
    assert.equal(sectionIdFromFolderName("film-lab"), "film-lab");
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

  it("renames the about group for youtube learning", () => {
    assert.equal(
      noteGroupLabel("about", "youtube-learning"),
      "About YouTube Learning",
    );
    assert.equal(noteGroupLabel("about"), "About this section");
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
    const notes = [
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
    ];

    const defaultGroups = groupLifeLabNotes(notes);

    assert.deepEqual(
      defaultGroups.map((group) => group.id),
      ["daily", "saved-articles", "reference", "about"],
    );
    assert.equal(defaultGroups[0]?.variant, "primary");
    assert.equal(defaultGroups[1]?.variant, "primary");
    assert.equal(defaultGroups[2]?.collapsedByDefault, true);
    assert.equal(defaultGroups[3]?.collapsedByDefault, true);
    assert.deepEqual(
      defaultGroups[2]?.notes.map((note) => note.title),
      ["Interests", "Sources"],
    );

    const readingBriefGroups = groupLifeLabNotes(notes, {
      sectionId: "reading-briefs",
    });

    assert.deepEqual(
      readingBriefGroups.map((group) => group.id),
      ["daily", "saved-articles", "section-files"],
    );
    assert.equal(readingBriefGroups[2]?.label, "About & reference");
    assert.equal(readingBriefGroups[2]?.collapsedByDefault, true);
    assert.deepEqual(
      readingBriefGroups[2]?.notes.map((note) => note.title),
      ["Interests", "Readme", "Sources"],
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

  it("uses smaller mermaid layout on compact profiles", () => {
    assert.equal(
      getMermaidInitializeOptions("light", "compact").themeVariables.fontSize,
      "13px",
    );
    assert.equal(
      getMermaidInitializeOptions("light", "landscape").flowchart.wrappingWidth,
      220,
    );
    assert.equal(
      getMermaidInitializeOptions("light", "comfortable").flowchart.wrappingWidth,
      180,
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
    assert.equal(
      parsed.metadata.source_url,
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
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

  it("extracts inline Q/A pairs from the same line", () => {
    const cards = extractFlashcardsFromMarkdown(
      "## Optional Flashcards\n\nQ: What is a P-functioning body? A: A body with the capacities that make it count as a person.",
    );

    assert.equal(cards.length, 1);
    assert.match(cards[0]?.question ?? "", /P-functioning body/i);
    assert.match(cards[0]?.answer ?? "", /capacities/i);
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
    assert.deepEqual(
      collectLifeLabFilterOptions(notes).playlist.map((option) => option.value),
      ["Series A", "Series B"],
    );
  });

  it("filters by study status and month", () => {
    const notes = [
      noteSummary({
        slug: "videos__2026-07-04-a",
        title: "A",
        subfolderLabel: "videos",
        metadata: { study_status: "studying" },
      }),
      noteSummary({
        slug: "videos__2026-06-10-b",
        title: "B",
        subfolderLabel: "videos",
        metadata: { study_status: "learned" },
      }),
    ];

    assert.deepEqual(
      filterLifeLabNotes(notes, { status: "studying" }).map((note) => note.slug),
      ["videos__2026-07-04-a"],
    );
    assert.deepEqual(
      filterLifeLabNotes(notes, { month: "2026-06" }).map((note) => note.slug),
      ["videos__2026-06-10-b"],
    );

    const options = collectLifeLabFilterOptions(notes);

    assert.deepEqual(
      options.status.map((option) => option.value),
      ["learned", "studying"],
    );
    assert.deepEqual(
      options.month.map((option) => option.value),
      ["2026-07", "2026-06"],
    );
    assert.equal(options.month[0]?.label, "July 2026");
  });
});

describe("life lab browsing", () => {
  const browseNotes = [
    noteSummary({
      slug: "videos__2026-07-04-newer",
      title: "Newer video",
      subfolderLabel: "videos",
      metadata: { study_status: "new" },
    }),
    noteSummary({
      slug: "videos__2026-06-01-older",
      title: "Older video",
      subfolderLabel: "videos",
      modifiedAt: "2026-07-05T10:00:00Z",
      metadata: { study_status: "studying" },
    }),
    noteSummary({
      slug: "videos__2026-05-01-learned",
      title: "Learned video",
      subfolderLabel: "videos",
      metadata: { study_status: "learned" },
    }),
  ];

  it("sorts notes by each sort key", () => {
    assert.deepEqual(
      sortLifeLabNotes(browseNotes, "newest").map((note) => note.title),
      ["Newer video", "Older video", "Learned video"],
    );
    assert.deepEqual(
      sortLifeLabNotes(browseNotes, "oldest").map((note) => note.title),
      ["Learned video", "Older video", "Newer video"],
    );
    assert.deepEqual(
      sortLifeLabNotes(browseNotes, "title").map((note) => note.title),
      ["Learned video", "Newer video", "Older video"],
    );
    assert.deepEqual(
      sortLifeLabNotes(browseNotes, "status").map((note) => note.title),
      ["Older video", "Newer video", "Learned video"],
    );
    assert.equal(
      sortLifeLabNotes(browseNotes, "recent")[0]?.title,
      "Older video",
    );
  });

  it("builds highlights with latest, continue, and recently added", () => {
    const highlights = buildLifeLabHighlights(browseNotes, 2);

    assert.deepEqual(
      highlights.latest.map((note) => note.title),
      ["Newer video", "Older video"],
    );
    assert.deepEqual(
      highlights.continueStudying.map((note) => note.title),
      ["Older video"],
    );
    assert.ok(
      highlights.recentlyAdded.every(
        (note) => !["Newer video", "Older video"].includes(note.title),
      ),
    );
  });

  it("shows highlights only for large unfiltered sections", () => {
    assert.equal(shouldShowLifeLabHighlights(20, false), true);
    assert.equal(shouldShowLifeLabHighlights(20, true), false);
    assert.equal(shouldShowLifeLabHighlights(5, false), false);
  });

  it("splits large reading-brief daily groups by month", () => {
    const manyDailies = Array.from({ length: 12 }, (_, index) => {
      const month = index < 6 ? "07" : "06";
      const day = String((index % 6) + 1).padStart(2, "0");

      return noteSummary({
        slug: `daily__2026-${month}-${day}-brief`,
        title: `Brief ${month}-${day}`,
        subfolderLabel: "daily",
        relativePath: `daily/2026-${month}-${day}-brief.md`,
      });
    });

    const groups = groupLifeLabNotes(manyDailies, {
      sectionId: "reading-briefs",
    });

    assert.deepEqual(
      groups.map((group) => group.label),
      ["Daily · July 2026", "Daily · June 2026"],
    );
    assert.equal(groups[0]?.variant, "primary");
    assert.equal(groups[1]?.variant, "disclosure");
    assert.equal(groups[1]?.collapsedByDefault, true);
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

    assert.deepEqual(chips.visible, []);
    assert.equal(chips.overflowCount, 0);
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

    assert.deepEqual(chips.visible, []);
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

  it("hides card chips on list surfaces", () => {
    const chips = selectVisibleMetadataChips(
      {
        topics: ["one", "two", "three", "four"],
        tags: ["five", "six"],
      },
      { sectionId: "youtube-learning", variant: "card" },
    );

    assert.equal(chips.visible.length, 0);
    assert.equal(chips.overflowCount, 0);
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

  it("encodes and decodes a stable device voice identity", () => {
    const voice = {
      name: "Samantha",
      lang: "en-US",
      voiceURI: "com.apple.samantha",
    } as SpeechSynthesisVoice;

    const id = encodeDeviceVoiceId(voice);
    const decoded = decodeDeviceVoiceId(id);

    assert.deepEqual(decoded, {
      voiceURI: "com.apple.samantha",
      name: "Samantha",
      lang: "en-US",
    });
    assert.equal(decodeDeviceVoiceId("google-us-english"), null);
    assert.equal(decodeDeviceVoiceId(SPEECH_AUTO_VOICE_ID), null);
  });

  it("persists device voices with the stable composite id", () => {
    const listed = listAllDeviceSpeechVoices([
      { name: "Serena", lang: "en-GB", voiceURI: "serena" } as SpeechSynthesisVoice,
    ]);

    assert.equal(listed.length, 1);
    assert.deepEqual(decodeDeviceVoiceId(listed[0].id), {
      voiceURI: "serena",
      name: "Serena",
      lang: "en-GB",
    });
  });

  it("resolves a saved voice by exact voiceURI without a fallback", () => {
    const voices = [
      { name: "Flo", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
      { name: "Serena", lang: "en-GB", voiceURI: "serena" } as SpeechSynthesisVoice,
    ];
    const id = encodeDeviceVoiceId(voices[1]);

    const result = resolveDeviceVoiceWithFallback(voices, id);

    assert.equal(result.voice?.name, "Serena");
    assert.equal(result.usedFallback, false);
  });

  it("resolves by name and lang when the voiceURI changed", () => {
    const savedId = encodeDeviceVoiceId({
      name: "Serena",
      lang: "en-GB",
      voiceURI: "old-serena-uri",
    } as SpeechSynthesisVoice);

    const voices = [
      { name: "Serena", lang: "en-GB", voiceURI: "new-serena-uri" } as SpeechSynthesisVoice,
    ];

    const result = resolveDeviceVoiceWithFallback(voices, savedId);

    assert.equal(result.voice?.voiceURI, "new-serena-uri");
    assert.equal(result.usedFallback, false);
  });

  it("uses a deterministic same-language fallback when the saved voice is missing", () => {
    const savedId = encodeDeviceVoiceId({
      name: "Serena",
      lang: "en-GB",
      voiceURI: "serena",
    } as SpeechSynthesisVoice);

    const voices = [
      { name: "Flo", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
      { name: "Thomas", lang: "fr-FR", voiceURI: "thomas" } as SpeechSynthesisVoice,
    ];

    const result = resolveDeviceVoiceWithFallback(voices, savedId);

    assert.equal(result.voice?.lang, "en-GB");
    assert.equal(result.usedFallback, true);
  });

  it("does not treat auto selection as a fallback", () => {
    const voices = [
      { name: "Flo", lang: "en-GB", voiceURI: "flo" } as SpeechSynthesisVoice,
    ];

    const result = resolveDeviceVoiceWithFallback(voices, SPEECH_AUTO_VOICE_ID);

    assert.equal(result.usedFallback, false);
    assert.equal(result.voice?.name, "Flo");
  });

  it("formats a clear voice-unavailable message", () => {
    assert.equal(
      formatVoiceUnavailableMessage("Flo (en-gb)"),
      "Your selected device voice is unavailable on this device. Using Flo (en-gb).",
    );
  });

  it("uses en-GB lang hint without assigning a voice by default", () => {
    assert.equal(DEFAULT_SPEECH_LANG, "en-GB");
  });

  it("includes updated speech rate options and default", () => {
    assert.deepEqual(SPEECH_RATE_OPTIONS, [0.8, 1, 1.15, 1.3, 1.5]);
    assert.equal(DEFAULT_SPEECH_RATE, 1);
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

describe("reading briefs", () => {
  const sampleBrief = readFileSync(
    join(
      process.cwd(),
      "lib/life-lab/fixtures/sample-bbc-world-service-daily-brief.md",
    ),
    "utf8",
  );

  it("defines Azin interest topics for brief prioritization", () => {
    assert.ok(READING_BRIEF_INTEREST_TOPICS.includes("iran"));
    assert.ok(READING_BRIEF_INTEREST_TOPICS.includes("systems thinking"));
    assert.ok(READING_BRIEF_INTEREST_TOPICS.length >= 10);
  });

  it("validates the sample BBC daily brief structure", () => {
    const assessment = assessReadingBriefStructure(sampleBrief);

    assert.deepEqual(assessment.missingSections, []);
    assert.ok(assessment.presentSections.includes("Opening synthesis"));
    assert.ok(assessment.presentSections.includes("Top story clusters"));
    assert.ok(assessment.hasSourceLimitation);
    assert.ok(assessment.flashcardCount >= READING_BRIEF_MIN_FLASHCARDS);
    assert.equal(assessment.meetsFlashcardMinimum, true);
  });

  it("extracts searchable metadata and flashcards from the sample brief", () => {
    const { metadata, body } = parseLifeLabFrontmatter(sampleBrief);
    const processed = processLifeLabNoteContent(
      {
        slug: "daily__2026-07-05-bbc-world-service",
        title: "BBC World Service Daily Brief — 2026-07-05",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: "daily",
        fileId: "fixture",
        relativePath: "daily/2026-07-05-bbc-world-service.md",
        metadata,
      },
      sampleBrief,
    );

    assert.equal(metadata.source, "bbc-world-service");
    assert.ok(metadata.topics?.includes("political legitimacy"));
    assert.ok(metadata.tags?.includes("iran"));
    assert.ok(processed.flashcards && processed.flashcards.length >= 8);
    assert.match(body, /Why this brief fits Azin/);
    assert.match(
      processed.excerpt,
      /States perform legitimacy under pressure while borders, public memory, and measurement all shift at once/,
    );
  });

  it("extracts card preview from short version fields", () => {
    const preview = extractReadingBriefPreview(sampleBrief);

    assert.match(preview, /States perform legitimacy under pressure/);
    assert.match(preview, /Iran succession ritual/);
    assert.match(preview, /What makes a state look legitimate/);
    assert.ok(preview.length <= 283);
  });

  it("prepares reading brief display with short version and nav", () => {
    const { glanceSegments, contentSegments, navSections } =
      prepareReadingBriefSegments(sampleBrief);

    assert.equal(glanceSegments.length, 1);
    assert.match(glanceSegments[0]?.content ?? "", /Pattern of the day/);
    assert.ok(contentSegments.some((segment) => segment.kind === "flashcards"));
    assert.ok(contentSegments.some((segment) => segment.kind === "save-worthy"));
    assert.deepEqual(
      navSections.map((section) => section.id),
      [
        "short-version",
        "top-clusters",
        "study-notes",
        "flashcards",
        "follow-ups",
      ],
    );
    assert.equal(readingBriefHeadingAnchor("Top story clusters"), "top-clusters");
    assert.equal(readingBriefHeadingAnchor("Optional Flashcards"), "flashcards");
    assert.equal(readingBriefHeadingAnchor("Follow-up questions"), "follow-ups");

    assert.equal(
      contentSegments.some(
        (segment) =>
          segment.kind === "markdown" && segment.heading === "Source note",
      ),
      false,
    );
  });

  it("formats reading brief display title without trailing date", () => {
    assert.equal(
      readingBriefDisplayTitle("BBC World Service Daily Brief — 2026-07-05"),
      "BBC World Service Daily Brief",
    );
  });

  it("parses glance list items from bullets or middots", () => {
    assert.deepEqual(parseGlanceListItems("One · Two · Three"), [
      "One",
      "Two",
      "Three",
    ]);
    assert.deepEqual(parseGlanceListItems("- Alpha\n- Beta"), ["Alpha", "Beta"]);
  });

  it("limits mobile detail metadata chips to three without overflow", () => {
    const { metadata } = parseLifeLabFrontmatter(sampleBrief);
    const chips = selectVisibleMetadataChips(metadata, {
      sectionId: "reading-briefs",
      variant: "detail-mobile",
    });

    assert.equal(chips.visible.length, 3);
    assert.equal(chips.overflowCount, 0);
  });

  it("transforms markdown tables into stacked card markdown", () => {
    const transformed = transformMarkdownTables(
      "| Item | One-line explanation |\n| --- | --- |\n| Khamenei | Leader |",
    );

    assert.match(transformed, /### Khamenei/);
    assert.match(transformed, /\*\*One-line explanation:\*\* Leader/);
  });

  it("parses save-worthy groups", () => {
    const groups = parseSaveWorthySection(
      "### Must save\n- [One](https://example.com)\n\n### Maybe save\n- [Two](https://example.com)",
    );

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.id, "must");
    assert.equal(groups[1]?.id, "maybe");
  });

  it("hides reading brief tags on list cards", () => {
    const { metadata } = parseLifeLabFrontmatter(sampleBrief);
    const chips = selectVisibleMetadataChips(metadata, {
      sectionId: "reading-briefs",
      variant: "card",
    });

    assert.equal(chips.visible.length, 0);
    assert.equal(chips.overflowCount, 0);
  });
});

describe("learning dictionary", () => {
  const fixtureRoot = join(
    import.meta.dirname,
    "life-lab/fixtures/learning-dictionary",
  );
  const conceptFixture = readFileSync(
    join(fixtureRoot, "concepts/political-legitimacy.md"),
    "utf8",
  );

  function dictionaryNote(
    relativePath: string,
    partial: Partial<LifeLabNoteSummary> = {},
  ): LifeLabNoteSummary {
    const slug = driveRelativePathToSlug(relativePath);

    return noteSummary({
      slug,
      title: slugToTitle(slug),
      relativePath,
      subfolderLabel: relativePathSubfolder(relativePath),
      ...partial,
    });
  }

  it("detects dictionary entries from metadata and subfolders", () => {
    const { metadata } = parseLifeLabFrontmatter(conceptFixture);

    assert.equal(isDictionaryEntryNote({
      relativePath: "concepts/political-legitimacy.md",
      subfolderLabel: "concepts",
      metadata,
    }), true);
    assert.equal(isDictionaryEntryNote({
      relativePath: "README.md",
      subfolderLabel: null,
      metadata: {},
    }), false);
  });

  it("extracts term, definition, and flashcards from sample entries", () => {
    const { metadata, body } = parseLifeLabFrontmatter(conceptFixture);
    const processed = processLifeLabNoteContent(
      dictionaryNote("concepts/political-legitimacy.md", {
        title: "Political Legitimacy",
        metadata,
      }),
      conceptFixture,
    );

    assert.equal(
      dictionaryDisplayTitle({
        title: processed.title,
        metadata,
        body,
      }),
      "Political legitimacy",
    );
    assert.match(
      extractDictionaryDefinition(body),
      /belief that a government or ruler is rightful/i,
    );
    assert.equal(processed.title, "Political legitimacy");
    assert.match(processed.excerpt, /belief that a government or ruler is rightful/i);
    assert.equal(processed.flashcardCount, 2);
    assert.equal(resolveDictionaryCategory(processed), "concepts");
  });

  it("groups dictionary entries by category and merges reference files", () => {
    const notes = [
      dictionaryNote("concepts/political-legitimacy.md", {
        title: "Political legitimacy",
        metadata: { type: "dictionary-entry", category: "concept" },
      }),
      dictionaryNote("phrases/perform-legitimacy.md", {
        title: "Perform legitimacy",
        metadata: { type: "dictionary-entry", category: "phrase" },
      }),
      dictionaryNote("people/khamenei.md", {
        title: "Ali Khamenei",
        metadata: { type: "dictionary-entry", category: "person" },
      }),
      dictionaryNote("places/lampedusa.md", {
        title: "Lampedusa",
        metadata: { type: "dictionary-entry", category: "place" },
      }),
      dictionaryNote("README.md", { title: "Learning Dictionary" }),
      dictionaryNote("index.md", { title: "Learning Dictionary index" }),
    ];

    const groups = groupLifeLabNotes(notes, { sectionId: "learning-dictionary" });

    assert.deepEqual(
      groups.map((group) => group.label),
      ["Concepts", "Phrases", "People", "Places", "About & reference"],
    );
    assert.equal(groups[0]?.notes.length, 1);
    assert.equal(groups.at(-1)?.variant, "disclosure");
    assert.equal(groups.at(-1)?.notes.length, 2);
  });

  it("searches dictionary entries by term, definition, tags, and related", () => {
    const { metadata, body } = parseLifeLabFrontmatter(conceptFixture);
    const processed = processLifeLabNoteContent(
      dictionaryNote("concepts/political-legitimacy.md", { metadata }),
      conceptFixture,
    );

    assert.equal(noteMatchesSearch(processed, "political legitimacy"), true);
    assert.equal(noteMatchesSearch(processed, "public memory"), true);
    assert.equal(noteMatchesSearch(processed, "state power"), true);
    assert.equal(noteMatchesSearch(processed, "rightful and entitled"), true);
    assert.equal(noteMatchesSearch(processed, "gateway islands"), false);
  });

  it("hides dictionary tags on list cards", () => {
    const { metadata } = parseLifeLabFrontmatter(conceptFixture);
    const chips = selectVisibleMetadataChips(metadata, {
      sectionId: "learning-dictionary",
      variant: "card",
    });

    assert.equal(chips.visible.length, 0);
    assert.equal(chips.overflowCount, 0);
  });
});

describe("film lab", () => {
  const fixtureRoot = join(import.meta.dirname, "life-lab/fixtures/film-lab");
  const tasteMapFixture = readFileSync(join(fixtureRoot, "taste-map.md"), "utf8");
  const ratingsSummaryFixture = readFileSync(
    join(fixtureRoot, "imdb/ratings-summary.md"),
    "utf8",
  );

  function filmLabNote(
    relativePath: string,
    partial: Partial<LifeLabNoteSummary> = {},
  ): LifeLabNoteSummary {
    const slug = driveRelativePathToSlug(relativePath);

    return noteSummary({
      slug,
      title: slugToTitle(slug),
      relativePath,
      subfolderLabel: relativePathSubfolder(relativePath),
      ...partial,
    });
  }

  it("excludes raw folders, csv paths, and non-markdown data", () => {
    assert.equal(isFilmLabExcludedRelativePath("imdb/raw/ratings.csv"), true);
    assert.equal(isFilmLabExcludedRelativePath("imdb/raw/export.tsv"), true);
    assert.equal(isFilmLabExcludedRelativePath("imdb/raw/notes.md"), true);
    assert.equal(isFilmLabExcludedRelativePath("raw/export.csv"), true);
    assert.equal(isFilmLabExcludedRelativePath("imdb/ratings-summary.md"), false);
    assert.equal(isFilmLabExcludedFolder("raw", "imdb"), true);
    assert.equal(isFilmLabExcludedFolder("raw", ""), true);
    assert.equal(isFilmLabExcludedFolder("imdb", ""), false);
  });

  it("groups synced drive markdown files into taste, imdb, and recommendations", () => {
    const notes = [
      filmLabNote("README.md", { title: "Film Lab" }),
      filmLabNote("taste-map.md", { title: "Taste map" }),
      filmLabNote("imdb/README.md", { title: "IMDb summaries" }),
      filmLabNote("imdb/ratings-summary.md", { title: "Ratings summary" }),
      filmLabNote("imdb/taste-patterns.md", { title: "Taste patterns" }),
      filmLabNote("imdb/watchlist-summary.md", { title: "Watchlist summary" }),
      filmLabNote("recommendations/what-to-watch-next.md", {
        title: "What to watch next",
      }),
    ];

    const groups = groupLifeLabNotes(notes, { sectionId: "film-lab" });

    assert.deepEqual(
      groups.map((group) => group.label),
      ["Taste Map", "IMDb Summaries", "Recommendations", "About & reference"],
    );
    assert.equal(groups[0]?.notes.length, 1);
    assert.equal(groups[1]?.notes.length, 3);
    assert.equal(groups[2]?.notes.length, 1);
    assert.equal(groups[3]?.notes.length, 2);
    assert.equal(groups.at(-1)?.variant, "disclosure");
  });

  it("groups film lab notes into taste, imdb, and discovery sections", () => {
    const notes = [
      filmLabNote("taste-map.md", { title: "Taste map" }),
      filmLabNote("imdb/ratings-summary.md", { title: "Ratings summary" }),
      filmLabNote("imdb/watchlist-summary.md", { title: "Watchlist summary" }),
      filmLabNote("recommendations/summer-picks.md", { title: "Summer picks" }),
      filmLabNote("favorites/after-hours.md", { title: "After Hours" }),
      filmLabNote("themes/noir.md", { title: "Noir" }),
      filmLabNote("directors/kubrick.md", { title: "Stanley Kubrick" }),
      filmLabNote("countries/japan.md", { title: "Japan" }),
      filmLabNote("README.md", { title: "Film Lab" }),
    ];

    const groups = groupLifeLabNotes(notes, { sectionId: "film-lab" });

    assert.deepEqual(
      groups.map((group) => group.label),
      [
        "Taste Map",
        "IMDb Summaries",
        "Recommendations",
        "Favorites",
        "Themes",
        "Directors",
        "Countries",
        "About & reference",
      ],
    );
    assert.equal(groups[0]?.notes.length, 1);
    assert.equal(groups[1]?.notes.length, 2);
    assert.equal(groups.at(-1)?.variant, "disclosure");
  });

  it("uses frontmatter summaries for compact previews", () => {
    const { metadata, body } = parseLifeLabFrontmatter(tasteMapFixture);
    const processed = processLifeLabNoteContent(
      filmLabNote("taste-map.md", { title: "Taste map", metadata }),
      tasteMapFixture,
    );

    assert.equal(isFilmLabNote({
      relativePath: "taste-map.md",
      metadata,
    }), true);
    assert.match(
      extractFilmLabPreview(body, metadata),
      /recurring taste patterns/i,
    );
    assert.match(processed.excerpt, /recurring taste patterns/i);
    assert.equal(processed.title, "Taste map");
  });

  it("opens imdb summary notes and searches by summary text", () => {
    const { metadata, body } = parseLifeLabFrontmatter(ratingsSummaryFixture);
    const processed = processLifeLabNoteContent(
      filmLabNote("imdb/ratings-summary.md", {
        title: "Ratings summary",
        metadata,
      }),
      ratingsSummaryFixture,
    );

    assert.equal(classifyFilmLabNoteGroup({
      slug: processed.slug,
      relativePath: "imdb/ratings-summary.md",
    }), "imdb-summaries");
    assert.match(processed.excerpt, /ratings cluster around/i);
    assert.equal(noteMatchesSearch(processed, "production design"), true);
    assert.equal(isNoisyCardPreview("imdb/raw/ratings.csv"), true);
    assert.equal(buildCardPreview(processed.excerpt), processed.excerpt);
    assert.doesNotMatch(body, /imdb\/raw/);
  });

  it("opens watchlist summary notes", () => {
    const watchlistFixture = readFileSync(
      join(fixtureRoot, "imdb/watchlist-summary.md"),
      "utf8",
    );
    const { metadata } = parseLifeLabFrontmatter(watchlistFixture);
    const processed = processLifeLabNoteContent(
      filmLabNote("imdb/watchlist-summary.md", {
        title: "Watchlist summary",
        metadata,
      }),
      watchlistFixture,
    );

    assert.equal(classifyFilmLabNoteGroup({
      slug: processed.slug,
      relativePath: "imdb/watchlist-summary.md",
    }), "imdb-summaries");
    assert.match(processed.excerpt, /queued to watch next/i);
  });

  it("opens what-to-watch-next recommendation notes", () => {
    const recommendationFixture = readFileSync(
      join(fixtureRoot, "recommendations/what-to-watch-next.md"),
      "utf8",
    );
    const { metadata } = parseLifeLabFrontmatter(recommendationFixture);
    const processed = processLifeLabNoteContent(
      filmLabNote("recommendations/what-to-watch-next.md", {
        title: "What to watch next",
        metadata,
      }),
      recommendationFixture,
    );

    assert.equal(classifyFilmLabNoteGroup({
      slug: processed.slug,
      relativePath: "recommendations/what-to-watch-next.md",
    }), "recommendations");
    assert.match(processed.excerpt, /watch next/i);
    assert.equal(processed.title, "What to watch next");
  });

  it("hides film lab tags on list cards", () => {
    const { metadata } = parseLifeLabFrontmatter(tasteMapFixture);
    const chips = selectVisibleMetadataChips(metadata, {
      sectionId: "film-lab",
      variant: "card",
      groupLabel: "Taste Map",
    });

    assert.equal(chips.visible.length, 0);
    assert.equal(chips.overflowCount, 0);
  });
});

describe("dictionary candidates in notes", () => {
  const sampleBriefPath = join(
    import.meta.dirname,
    "life-lab/fixtures/sample-bbc-world-service-daily-brief.md",
  );
  const sampleBrief = readFileSync(sampleBriefPath, "utf8");
  const { body: sampleBriefBody } = parseLifeLabFrontmatter(sampleBrief);

  it("extracts dictionary candidate sections and builds copy prompts", () => {
    const candidates = extractDictionaryCandidatesSection(sampleBriefBody);

    assert.ok(candidates);
    assert.equal(candidates?.title, "Dictionary candidates");
    assert.deepEqual(summarizeDictionaryCandidates(candidates?.content ?? ""), [
      "Political legitimacy",
      "Gateway island",
      "Coalition arithmetic",
      "Heat exposure gap",
    ]);

    const prompt = buildDictionaryCandidatesCopyPrompt({
      noteTitle: "BBC World Service Daily Brief",
      content: candidates?.content ?? "",
    });

    assert.match(prompt, /Add these dictionary candidates from this note/i);
    assert.match(prompt, /BBC World Service Daily Brief/);
    assert.match(prompt, /Political legitimacy/);
  });

  it("keeps non-dictionary sections when splitting note content", () => {
    assert.equal(hasDictionaryStudySections(sampleBriefBody), true);

    const blocks = buildDictionaryNoteContentBlocks(sampleBriefBody);
    const markdownBlocks = blocks.filter((block) => block.kind === "markdown");
    const dictionaryBlocks = blocks.filter(
      (block) => block.kind === "dictionary-section",
    );

    assert.ok(markdownBlocks.length > 0);
    assert.equal(
      dictionaryBlocks.filter((block) => block.section.kind === "candidates")
        .length,
      1,
    );
    assert.ok(
      dictionaryBlocks.some((block) => block.section.kind === "vocabulary"),
    );
    assert.ok(
      dictionaryBlocks.some((block) => block.section.kind === "names"),
    );
    assert.ok(
      markdownBlocks.some((block) =>
        block.content.includes("Follow-up questions"),
      ),
    );
  });

  it("renders reading brief segments without duplicating dictionary candidates", () => {
    const { contentSegments } = prepareReadingBriefSegments(sampleBriefBody);

    assert.equal(
      contentSegments.some(
        (segment) =>
          segment.kind === "markdown" &&
          segment.heading === "Dictionary candidates",
      ),
      false,
    );
    assert.equal(
      contentSegments.some(
        (segment) =>
          segment.kind === "markdown" &&
          segment.heading === "Vocabulary and phrasing",
      ),
      true,
    );
  });
});

describe("life lab card previews", () => {
  it("skips noisy previews with urls and metadata labels", () => {
    assert.equal(isNoisyCardPreview("URL: https://youtube.com/watch?v=abc"), true);
    assert.equal(isNoisyCardPreview("Channel: Lessons from the Past"), true);
    assert.equal(isNoisyCardPreview("videos/2026-07-05-note.md"), true);
    assert.equal(
      buildCardPreview("A clean one-line summary about political legitimacy."),
      "A clean one-line summary about political legitimacy.",
    );
    assert.equal(
      selectCardPreview({
        excerpt: "URL: https://youtube.com/watch?v=abc",
        searchText: "political legitimacy in Iran",
      }),
      null,
    );
  });

  it("shows a clean search snippet when search is active", () => {
    const preview = selectCardPreview(
      {
        excerpt: "URL: https://youtube.com/watch?v=abc",
        searchText:
          "Notes about political legitimacy and succession in modern Iran.",
      },
      { searchQuery: "political legitimacy" },
    );

    assert.match(preview ?? "", /political legitimacy/i);
    assert.doesNotMatch(preview ?? "", /https?:\/\//);
  });
});

describe("playlist index notes", () => {
  const fixturePath = join(
    import.meta.dirname,
    "life-lab/fixtures/sample-playlist-index.md",
  );
  const samplePlaylistIndex = readFileSync(fixturePath, "utf8");

  it("detects playlist index notes by metadata, path, and table shape", () => {
    const { metadata, body } = parseLifeLabFrontmatter(samplePlaylistIndex);

    assert.equal(isPlaylistIndexNote({
      sectionId: "youtube-learning",
      relativePath: "playlists/the-iranian-revolution.md",
      subfolderLabel: "playlists",
      metadata,
      content: body,
    }), true);
    assert.equal(hasPlaylistVideosTable(body), true);
    assert.equal(isPlaylistIndexNote({
      sectionId: "youtube-learning",
      relativePath: "videos/2026-07-05-shahs-last-stand.md",
      subfolderLabel: "videos",
      metadata: { type: "youtube-learning" },
      content: "# Video note\n\nRegular video notes without a playlist table.",
    }), false);
  });

  it("parses playlist videos, summary counts, and batch notes", () => {
    const { metadata, body } = parseLifeLabFrontmatter(samplePlaylistIndex);
    const note = processLifeLabNoteContent(
      {
        slug: "playlists__the-iranian-revolution",
        title: "The Iranian Revolution",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: "Jul 5, 2026",
        subfolderLabel: "playlists",
        fileId: "fixture-playlist",
        relativePath: "playlists/the-iranian-revolution.md",
        metadata,
      },
      samplePlaylistIndex,
    );
    const display = parsePlaylistIndexNote({
      ...note,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    });

    assert.equal(display.playlistTitle, "The Iranian Revolution");
    assert.equal(display.channel, "The Rest Is History");
    assert.equal(display.summary.total, 5);
    assert.equal(display.summary.processed, 3);
    assert.equal(display.summary.pending, 1);
    assert.equal(display.summary.skipped, 1);
    assert.equal(display.summary.error, 0);
    assert.match(
      formatPlaylistProcessingSummary(display.summary),
      /3 processed · 1 pending · 1 skipped · 0 errors/,
    );
    assert.equal(display.batchNotes.length, 3);
    assert.equal(display.videos[0]?.noteHref, "/life-lab/youtube-learning/videos__2026-07-05-shahs-last-stand");
    assert.equal(display.videos[0]?.duration, "42:18");
    assert.equal(display.videos[3]?.noteHref, null);
    assert.match(display.focus ?? "", /tracking playlist processing/i);
    assert.equal(display.studyStatus, "In Progress");
    assert.equal(display.transcriptStatus, "Captions used · transcripts not included");
    assert.equal(display.sourcePath, "playlists/the-iranian-revolution.md");
    assert.equal(shouldRenderPlaylistIndexUi({
      ...note,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    }), true);
  });

  it("cleans repeated playlist suffixes from video display titles", () => {
    const content = `---
type: playlist-index
playlist: Great Art Explained
channel: Great Art Explained
---

# Great Art Explained

## Videos

| Status | Episode | Video title | Duration |
| --- | --- | --- | --- |
| processed | 5 | Frida Kahlo's 'The Two Fridas': Great Art Explained | 15:01 |
| processed | 1 | Picasso's Guernica: Great Art Explained | 12:00 |
| processed | 2 | Michelangelo's David: Great Art Explained | 14:22 |
`;

    const { metadata, body } = parseLifeLabFrontmatter(content);
    const display = parsePlaylistIndexNote({
      slug: "playlists__great-art-explained",
      title: "Great Art Explained",
      excerpt: "",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: null,
      subfolderLabel: "playlists",
      fileId: "fixture-great-art",
      relativePath: "playlists/great-art-explained.md",
      metadata,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    });

    assert.equal(display.videos[0]?.title, "Frida Kahlo's 'The Two Fridas': Great Art Explained");
    assert.equal(
      display.videos[0]?.displayTitle,
      "Frida Kahlo's 'The Two Fridas'",
    );
    assert.equal(display.videos[1]?.displayTitle, "Picasso's Guernica");
    assert.equal(display.videos[2]?.displayTitle, "Michelangelo's David");
  });

  it("builds youtube video note links only for videos/ note filenames", () => {
    assert.equal(
      resolveYoutubeVideoNoteSlug("videos/2026-07-05-shahs-last-stand.md"),
      "videos__2026-07-05-shahs-last-stand",
    );
    assert.equal(
      buildYoutubeVideoNoteHref(
        "youtube-learning",
        "2026-07-05-shahs-last-stand.md",
      ),
      "/life-lab/youtube-learning/videos__2026-07-05-shahs-last-stand",
    );
    assert.equal(
      buildYoutubeVideoNoteHref("youtube-learning", "archive/old-note.md"),
      null,
    );
  });

  it("falls back when playlist table parsing fails", () => {
    assert.equal(shouldRenderPlaylistIndexUi({
      slug: "playlists__empty",
      title: "Empty playlist",
      excerpt: "",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: null,
      subfolderLabel: "playlists",
      fileId: "fixture-empty",
      relativePath: "playlists/empty.md",
      metadata: { type: "playlist-index" },
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: "# Empty\n\nNo table yet.",
    }), false);
  });

  it("uses playlist progress as the card excerpt during enrichment", () => {
    const processed = processLifeLabNoteContent(
      {
        slug: "playlists__the-iranian-revolution",
        title: "The Iranian Revolution",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: "playlists",
        fileId: "fixture-playlist",
        relativePath: "playlists/the-iranian-revolution.md",
      },
      samplePlaylistIndex,
    );

    assert.match(processed.excerpt, /3 processed · 1 pending/);
  });

  it("detects playlist indexes from youtube source metadata and summary sections", () => {
    assert.equal(isPlaylistIndexNote({
      sectionId: "youtube-learning",
      relativePath: "indexes/justice-with-michael-sandel.md",
      metadata: {
        source: "youtube",
        playlist: "Justice with Michael Sandel",
      },
    }), true);
    assert.equal(isPlaylistIndexNote({
      sectionId: "youtube-learning",
      content: "## Playlist summary\n\nOverview.\n\n## Video list\n\n| Status | Title |\n| --- | --- |\n| processed | Lecture 1 |",
    }), true);
  });

  it("builds previous and next navigation for processed video notes", () => {
    const { metadata, body } = parseLifeLabFrontmatter(samplePlaylistIndex);
    const display = parsePlaylistIndexNote({
      slug: "playlists__the-iranian-revolution",
      title: "The Iranian Revolution",
      excerpt: "",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: "Jul 5, 2026",
      subfolderLabel: "playlists",
      fileId: "fixture-playlist",
      relativePath: "playlists/the-iranian-revolution.md",
      metadata,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    });

    const navigation = buildVideoPlaylistNavigation(
      display,
      "videos__2026-07-05-khomeini-returns",
      "playlists__the-iranian-revolution",
      "youtube-learning",
    );

    assert.ok(navigation);
    assert.equal(
      navigation?.previous?.href,
      "/life-lab/youtube-learning/videos__2026-07-05-shahs-last-stand",
    );
    assert.equal(
      navigation?.next?.href,
      "/life-lab/youtube-learning/videos__2026-07-05-revolutionary-courts",
    );
    assert.equal(
      navigation?.playlistIndexHref,
      "/life-lab/youtube-learning/playlists__the-iranian-revolution",
    );
    assert.equal(navigation?.next?.title, "Revolutionary Courts");
  });

  it("marks neighboring pending videos as unavailable in navigation", () => {
    const { metadata, body } = parseLifeLabFrontmatter(samplePlaylistIndex);
    const display = parsePlaylistIndexNote({
      slug: "playlists__the-iranian-revolution",
      title: "The Iranian Revolution",
      excerpt: "",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: null,
      subfolderLabel: "playlists",
      fileId: "fixture-playlist",
      relativePath: "playlists/the-iranian-revolution.md",
      metadata,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    });

    const navigation = buildVideoPlaylistNavigation(
      display,
      "videos__2026-07-05-revolutionary-courts",
      "playlists__the-iranian-revolution",
      "youtube-learning",
    );

    assert.equal(navigation?.next?.href, null);
    assert.equal(navigation?.next?.status, "pending");
    assert.equal(navigation?.next?.title, "Aftermath and Memory");
  });

  it("builds playlist navigation from video notes when no index note exists", () => {
    const records = [
      noteSummary({
        slug: "videos__2026-07-04-part-one",
        title: "Arguments for the Soul, Part I",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-04-part-one.md",
        metadata: { playlist: "Death with Shelly Kagan", source: "youtube" },
      }),
      noteSummary({
        slug: "videos__2026-07-05-part-two",
        title: "Arguments for the Soul, Part II",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-05-part-two.md",
        metadata: { playlist: "Death with Shelly Kagan", source: "youtube" },
      }),
      noteSummary({
        slug: "videos__2026-07-06-part-three",
        title: "Arguments for the Soul, Part III",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-06-part-three.md",
        metadata: { playlist: "Death with Shelly Kagan", source: "youtube" },
      }),
    ];

    const navigation = buildPlaylistNavigationFromVideoNotes(
      records,
      records[1]!,
      "youtube-learning",
    );

    assert.ok(navigation);
    assert.equal(
      navigation?.previous?.href,
      "/life-lab/youtube-learning/videos__2026-07-04-part-one",
    );
    assert.equal(
      navigation?.next?.href,
      "/life-lab/youtube-learning/videos__2026-07-06-part-three",
    );
    assert.match(navigation?.playlistIndexHref ?? "", /playlist=Death/);
    assert.equal(navigation?.previous?.title, "Arguments for the Soul, Part I");
    assert.equal(navigation?.next?.title, "Arguments for the Soul, Part III");
  });

  it("omits previous on the first playlist video and next on the last", () => {
    const records = [
      noteSummary({
        slug: "videos__2026-07-04-part-one",
        title: "Part I",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-04-part-one.md",
        metadata: { playlist: "Sample Playlist", source: "youtube" },
      }),
      noteSummary({
        slug: "videos__2026-07-06-part-three",
        title: "Part III",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-06-part-three.md",
        metadata: { playlist: "Sample Playlist", source: "youtube" },
      }),
    ];

    const first = buildPlaylistNavigationFromVideoNotes(
      records,
      records[0]!,
      "youtube-learning",
    );
    const last = buildPlaylistNavigationFromVideoNotes(
      records,
      records[1]!,
      "youtube-learning",
    );

    assert.equal(first?.previous, null);
    assert.ok(first?.next);
    assert.ok(last?.previous);
    assert.equal(last?.next, null);
  });

  it("finds playlist indexes for video notes by playlist metadata or note slug", () => {
    const { metadata, body } = parseLifeLabFrontmatter(samplePlaylistIndex);
    const display = parsePlaylistIndexNote({
      slug: "playlists__the-iranian-revolution",
      title: "The Iranian Revolution",
      excerpt: "",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: null,
      subfolderLabel: "playlists",
      fileId: "fixture-playlist",
      relativePath: "playlists/the-iranian-revolution.md",
      metadata,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    });
    const records = [
      {
        slug: "playlists__the-iranian-revolution",
        title: "The Iranian Revolution",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: "playlists",
        fileId: "fixture-playlist",
        relativePath: "playlists/the-iranian-revolution.md",
        metadata,
      },
      {
        slug: "videos__2026-07-05-khomeini-returns",
        title: "Khomeini Returns",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: "videos",
        fileId: "fixture-video",
        relativePath: "videos/2026-07-05-khomeini-returns.md",
        metadata: {
          playlist: "The Iranian Revolution",
          source: "youtube",
        },
      },
    ];
    const playlistContents = new Map([
      ["playlists__the-iranian-revolution", display],
    ]);

    assert.equal(
      findPlaylistIndexSlugForVideo(records, records[1]!, playlistContents),
      "playlists__the-iranian-revolution",
    );
    assert.equal(isYoutubeVideoNote(records[1]!), true);
    assert.equal(isYoutubeVideoNote(records[0]!), false);
  });

  it("lists all playlist videos for large indexes", () => {
    const rows = Array.from({ length: 19 }, (_, index) => {
      const episode = index + 1;
      const status = episode <= 19 ? "processed" : "pending";

      return `| ${status} | ${episode} | Lecture ${episode} | 55:00 | https://www.youtube.com/watch?v=vid${episode} | videos/lecture-${episode}.md |`;
    }).join("\n");
    const body = `# Justice with Michael Sandel\n\n## Videos\n\n| Status | Episode | Video title | Duration | Video URL | Note filename |\n| --- | --- | --- | --- | --- | --- |\n${rows}`;
    const display = parsePlaylistIndexNote({
      slug: "playlists__justice-with-michael-sandel",
      title: "Justice with Michael Sandel",
      excerpt: "",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: null,
      subfolderLabel: "playlists",
      fileId: "fixture-justice",
      relativePath: "playlists/justice-with-michael-sandel.md",
      metadata: { type: "playlist-index", playlist: "Justice with Michael Sandel" },
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
    });

    assert.equal(display.summary.total, 19);
    assert.equal(display.summary.processed, 19);
    assert.equal(display.videos[18]?.noteHref, "/life-lab/youtube-learning/videos__lecture-19");
  });
});

describe("life lab note detail content", () => {
  it("strips the leading markdown h1 when the page header shows the title", () => {
    const content = `# Justice Episode 1

## Short version

Opening lecture on moral philosophy.`;

    assert.equal(
      stripLeadingMarkdownH1(content),
      "## Short version\n\nOpening lecture on moral philosophy.",
    );
    assert.equal(stripLeadingMarkdownH1("No heading here"), "No heading here");
  });

  it("shortens long youtube video titles for display only", () => {
    const fullTitle =
      'Justice: What\'s The Right Thing To Do? Episode 01 "THE MORAL SIDE OF MURDER"';

    assert.equal(
      youtubeVideoDisplayTitle(fullTitle),
      "Justice, Episode 1: The Moral Side of Murder",
    );
    assert.equal(
      lifeLabNoteDisplayTitle({
        title: fullTitle,
        sectionId: "youtube-learning",
        relativePath: "videos/2026-07-06-justice-episode-01.md",
        subfolderLabel: "videos",
      }),
      "Justice, Episode 1: The Moral Side of Murder",
    );
    assert.equal(
      lifeLabNoteDisplayTitleDiffers({
        title: fullTitle,
        sectionId: "youtube-learning",
        relativePath: "videos/2026-07-06-justice-episode-01.md",
        subfolderLabel: "videos",
      }),
      true,
    );
    assert.equal(
      lifeLabNoteDisplayTitle({
        title: "Short title",
        sectionId: "film-lab",
        relativePath: "taste-map.md",
      }),
      "Short title",
    );
    assert.equal(
      youtubeVideoDisplayTitle(
        "Frida Kahlo's 'The Two Fridas': Great Art Explained",
        { playlist: "Great Art Explained" },
      ),
      "Frida Kahlo's 'The Two Fridas'",
    );
    assert.equal(
      lifeLabNoteDisplayTitleDiffers({
        title: "Frida Kahlo's 'The Two Fridas': Great Art Explained",
        sectionId: "youtube-learning",
        relativePath: "videos/2026-07-10-two-fridas.md",
        subfolderLabel: "videos",
        metadata: { playlist: "Great Art Explained", source: "youtube" },
      }),
      true,
    );
  });

  it("limits mobile detail metadata chips to three without overflow text", () => {
    const chips = selectVisibleMetadataChips(
      {
        tags: ["a", "b", "c", "d", "e"],
        topics: ["topic"],
      },
      {
        sectionId: "youtube-learning",
        variant: "detail-mobile",
      },
    );

    assert.equal(chips.visible.length, 3);
    assert.equal(chips.overflowCount, 0);
  });
});
