import {
  extractFlashcardsFromSectionText,
  isFlashcardSectionTitle,
} from "@/lib/life-lab/flashcards";
import { isHiddenTechnicalHeading } from "@/lib/life-lab/hidden-markdown-sections";
import { isLearningMapSection } from "@/lib/life-lab/learning-map-sections";
import {
  isLectureNotesCollapsibleSectionTitle,
  isLectureNotesSectionId,
  isShortVersionSectionTitle,
} from "@/lib/life-lab/lecture-notes";
import { extractMermaidCode } from "@/lib/life-lab/mermaid-outline";
import { transformMarkdownTables } from "@/lib/life-lab/reading-briefs";
import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";
import type {
  LifeLabFlashcard,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";

export type LifeLabNoteContentBlock =
  | { kind: "markdown"; content: string }
  | {
      kind: "learning-map";
      title: string;
      mermaidCode: string;
      introMarkdown?: string;
    }
  | { kind: "flashcards"; cards: LifeLabFlashcard[]; title: string }
  | {
      kind: "transcript";
      content: string;
      title: string;
      summaryHint?: string;
    };

export type BuildLifeLabNoteContentBlocksOptions = {
  prioritizeShortVersion?: boolean;
  prioritizeLearningMap?: boolean;
  collapseTranscriptNotes?: boolean;
};

type MarkdownH2Section = {
  title: string;
  content: string;
  start: number;
  end: number;
};

function listMarkdownH2Sections(body: string): MarkdownH2Section[] {
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
      isLearningMapSection(section.title) ||
      (collapseTranscriptNotes &&
        isLectureNotesCollapsibleSectionTitle(section.title)),
  );
}

function introMarkdownFromLearningMapBody(content: string): string | undefined {
  const withoutFence = content
    .replace(/```mermaid\s*\n[\s\S]*?```/i, "")
    .trim();

  if (!withoutFence) {
    return undefined;
  }

  const plain = withoutFence
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain || plain.length > 220) {
    return undefined;
  }

  return plain;
}

function sectionToBlock(
  section: { title: string; content: string },
  options: {
    collapseTranscriptNotes: boolean;
    compactLearningMap: boolean;
  },
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

  if (options.compactLearningMap && isLearningMapSection(section.title)) {
    const mermaidCode = extractMermaidCode(section.content);

    if (mermaidCode) {
      return {
        kind: "learning-map",
        title: section.title,
        mermaidCode,
        introMarkdown: introMarkdownFromLearningMapBody(section.content),
      };
    }
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
  options: {
    collapseTranscriptNotes: boolean;
    compactLearningMap: boolean;
  },
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

/**
 * Shared learning content order:
 * preface → Learning Map → Short version → remaining H2s in document order.
 */
function prioritizeLearningContentBlocks(
  body: string,
  options: {
    collapseTranscriptNotes: boolean;
    compactLearningMap: boolean;
    prioritizeLearningMap: boolean;
    prioritizeShortVersion: boolean;
  },
): LifeLabNoteContentBlock[] {
  const sections = listMarkdownH2Sections(body);
  const learningMap = options.prioritizeLearningMap
    ? sections.find((section) => isLearningMapSection(section.title))
    : undefined;
  const shortVersion = options.prioritizeShortVersion
    ? sections.find((section) => isShortVersionSectionTitle(section.title))
    : undefined;
  const blocks: LifeLabNoteContentBlock[] = [];
  const firstH2Start = sections[0]?.start ?? body.length;
  const preface = body.slice(0, firstH2Start).trim();

  if (preface) {
    blocks.push({ kind: "markdown", content: preface });
  }

  const prioritySections = [learningMap, shortVersion].filter(
    (section): section is MarkdownH2Section => Boolean(section),
  );

  const emittedStarts = new Set<number>();

  for (const section of prioritySections) {
    if (emittedStarts.has(section.start)) {
      continue;
    }

    const block = sectionToBlock(section, options);

    if (block) {
      blocks.push(block);
      emittedStarts.add(section.start);
    }
  }

  for (const section of sections) {
    if (emittedStarts.has(section.start)) {
      continue;
    }

    const block = sectionToBlock(section, options);

    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

export function resolveLifeLabNoteContentBlockOptions(
  sectionId?: LifeLabSectionId,
): BuildLifeLabNoteContentBlocksOptions {
  const isLectureNotes = isLectureNotesSectionId(sectionId);
  const isPodcastEpisode = sectionId === "podcasts";

  return {
    prioritizeLearningMap: true,
    prioritizeShortVersion: isLectureNotes || isPodcastEpisode,
    collapseTranscriptNotes: isLectureNotes || isPodcastEpisode,
  };
}

export function buildLifeLabNoteContentBlocks(
  body: string,
  options: BuildLifeLabNoteContentBlocksOptions = {},
): LifeLabNoteContentBlock[] {
  const collapseTranscriptNotes = options.collapseTranscriptNotes === true;
  const prioritizeShortVersion = options.prioritizeShortVersion === true;
  const prioritizeLearningMap = options.prioritizeLearningMap === true;
  const compactLearningMap = prioritizeLearningMap;
  const blockOptions = { collapseTranscriptNotes, compactLearningMap };

  const needsSplit =
    noteHasSpecialSections(body, collapseTranscriptNotes) ||
    prioritizeShortVersion ||
    prioritizeLearningMap;

  if (!needsSplit) {
    return [{ kind: "markdown", content: body }];
  }

  if (prioritizeLearningMap || prioritizeShortVersion) {
    const blocks = prioritizeLearningContentBlocks(body, {
      ...blockOptions,
      prioritizeLearningMap,
      prioritizeShortVersion,
    });

    return blocks.length > 0 ? blocks : [{ kind: "markdown", content: body }];
  }

  const blocks = buildBlocksInDocumentOrder(body, blockOptions);

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
      case "learning-map":
        titles.push(block.title);
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
