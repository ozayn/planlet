import {
  extractFlashcardsFromSectionText,
  isFlashcardSectionTitle,
} from "@/lib/life-lab/flashcards";
import { isHiddenTechnicalHeading } from "@/lib/life-lab/hidden-markdown-sections";
import {
  isLectureNotesCollapsibleSectionTitle,
  isShortVersionSectionTitle,
} from "@/lib/life-lab/lecture-notes";
import { transformMarkdownTables } from "@/lib/life-lab/reading-briefs";
import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";
import type { LifeLabFlashcard } from "@/lib/life-lab/constants";

export type LifeLabNoteContentBlock =
  | { kind: "markdown"; content: string }
  | { kind: "flashcards"; cards: LifeLabFlashcard[]; title: string }
  | {
      kind: "transcript";
      content: string;
      title: string;
      summaryHint?: string;
    };

export type BuildLifeLabNoteContentBlocksOptions = {
  prioritizeShortVersion?: boolean;
  collapseTranscriptNotes?: boolean;
};

function listMarkdownH2Sections(body: string): {
  title: string;
  content: string;
  start: number;
  end: number;
}[] {
  const regex = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(regex)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const contentStart = start + match[0].length;
    const nextMatch = matches[index + 1];
    const end = nextMatch?.index ?? body.length;

    return {
      title: match[1].trim(),
      content: body.slice(contentStart, end).trim(),
      start,
      end,
    };
  });
}

function noteHasSpecialSections(
  body: string,
  collapseTranscriptNotes: boolean,
): boolean {
  return listMarkdownH2Sections(body).some(
    (section) =>
      isFlashcardSectionTitle(section.title) ||
      isFullTranscriptSectionTitle(section.title) ||
      (collapseTranscriptNotes &&
        isLectureNotesCollapsibleSectionTitle(section.title)),
  );
}

function sectionToBlock(
  section: { title: string; content: string },
  options: { collapseTranscriptNotes: boolean },
): LifeLabNoteContentBlock | null {
  if (isHiddenTechnicalHeading(section.title)) {
    return null;
  }

  if (isFullTranscriptSectionTitle(section.title)) {
    if (isTranscriptMetadataOnly(section.content)) {
      return null;
    }

    return {
      kind: "transcript",
      title: section.title,
      content: transformMarkdownTables(section.content),
      summaryHint: "Show transcript",
    };
  }

  if (
    options.collapseTranscriptNotes &&
    isLectureNotesCollapsibleSectionTitle(section.title)
  ) {
    if (!section.content.trim()) {
      return null;
    }

    return {
      kind: "transcript",
      title: section.title,
      content: transformMarkdownTables(section.content),
      summaryHint: "Show notes",
    };
  }

  if (isFlashcardSectionTitle(section.title)) {
    const cards = extractFlashcardsFromSectionText(section.content);

    if (cards.length === 0) {
      return null;
    }

    return {
      kind: "flashcards",
      title: section.title,
      cards,
    };
  }

  return {
    kind: "markdown",
    content: transformMarkdownTables(
      `## ${section.title}\n\n${section.content}`,
    ),
  };
}

function buildBlocksInDocumentOrder(
  body: string,
  options: { collapseTranscriptNotes: boolean },
): LifeLabNoteContentBlock[] {
  const sections = listMarkdownH2Sections(body);
  const blocks: LifeLabNoteContentBlock[] = [];
  let cursor = 0;

  for (const section of sections) {
    const before = body.slice(cursor, section.start).trim();

    if (before) {
      blocks.push({ kind: "markdown", content: before });
    }

    const block = sectionToBlock(section, options);

    if (block) {
      blocks.push(block);
    }

    cursor = section.end;
  }

  const trailing = body.slice(cursor).trim();

  if (trailing) {
    blocks.push({ kind: "markdown", content: trailing });
  }

  return blocks;
}

function prioritizeShortVersionBlocks(
  body: string,
  options: { collapseTranscriptNotes: boolean },
): LifeLabNoteContentBlock[] {
  const sections = listMarkdownH2Sections(body);
  const shortVersion = sections.find((section) =>
    isShortVersionSectionTitle(section.title),
  );
  const blocks: LifeLabNoteContentBlock[] = [];

  const firstH2Start = sections[0]?.start ?? body.length;
  const preface = body.slice(0, firstH2Start).trim();

  if (preface) {
    blocks.push({ kind: "markdown", content: preface });
  }

  if (shortVersion) {
    const shortBlock = sectionToBlock(shortVersion, options);

    if (shortBlock) {
      blocks.push(shortBlock);
    }
  }

  for (const section of sections) {
    if (shortVersion && section.start === shortVersion.start) {
      continue;
    }

    const block = sectionToBlock(section, options);

    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

export function buildLifeLabNoteContentBlocks(
  body: string,
  options: BuildLifeLabNoteContentBlocksOptions = {},
): LifeLabNoteContentBlock[] {
  const collapseTranscriptNotes = options.collapseTranscriptNotes === true;
  const prioritizeShortVersion = options.prioritizeShortVersion === true;

  if (!noteHasSpecialSections(body, collapseTranscriptNotes)) {
    if (!prioritizeShortVersion) {
      return [{ kind: "markdown", content: body }];
    }
  }

  const blocks = prioritizeShortVersion
    ? prioritizeShortVersionBlocks(body, { collapseTranscriptNotes })
    : buildBlocksInDocumentOrder(body, { collapseTranscriptNotes });

  return blocks.length > 0 ? blocks : [{ kind: "markdown", content: body }];
}

function extractH2TitlesFromMarkdown(content: string): string[] {
  const regex = /^##\s+(.+?)\s*$/gm;

  return [...content.matchAll(regex)].map((match) => match[1].trim());
}

/** Visible section titles in the same order as the note detail page renders them. */
export function listRenderedVisibleSectionTitles(
  body: string,
  options: BuildLifeLabNoteContentBlocksOptions = {},
): string[] {
  const blocks = buildLifeLabNoteContentBlocks(body, options);
  const titles: string[] = [];

  for (const block of blocks) {
    switch (block.kind) {
      case "markdown":
        titles.push(...extractH2TitlesFromMarkdown(block.content));
        break;
      case "flashcards":
        titles.push(block.title);
        break;
      case "transcript":
        titles.push(block.title);
        break;
      default:
        break;
    }
  }

  return titles;
}
