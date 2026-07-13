import {
  extractFlashcardsFromSectionText,
  isFlashcardSectionTitle,
} from "@/lib/life-lab/flashcards";
import { isHiddenTechnicalHeading } from "@/lib/life-lab/hidden-markdown-sections";
import { transformMarkdownTables } from "@/lib/life-lab/reading-briefs";
import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";
import type { LifeLabFlashcard } from "@/lib/life-lab/constants";

export type LifeLabNoteContentBlock =
  | { kind: "markdown"; content: string }
  | { kind: "flashcards"; cards: LifeLabFlashcard[]; title: string }
  | { kind: "transcript"; content: string; title: string };

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

function noteHasSpecialSections(body: string): boolean {
  return listMarkdownH2Sections(body).some(
    (section) =>
      isFlashcardSectionTitle(section.title) ||
      isFullTranscriptSectionTitle(section.title),
  );
}

export function buildLifeLabNoteContentBlocks(
  body: string,
): LifeLabNoteContentBlock[] {
  const sections = listMarkdownH2Sections(body);

  if (!noteHasSpecialSections(body)) {
    return [{ kind: "markdown", content: body }];
  }

  const blocks: LifeLabNoteContentBlock[] = [];
  let cursor = 0;

  for (const section of sections) {
    const before = body.slice(cursor, section.start).trim();

    if (before) {
      blocks.push({ kind: "markdown", content: before });
    }

    if (isHiddenTechnicalHeading(section.title)) {
      cursor = section.end;
      continue;
    }

    if (isFullTranscriptSectionTitle(section.title)) {
      if (!isTranscriptMetadataOnly(section.content)) {
        blocks.push({
          kind: "transcript",
          title: section.title,
          content: transformMarkdownTables(section.content),
        });
      }
    } else if (isFlashcardSectionTitle(section.title)) {
      const cards = extractFlashcardsFromSectionText(section.content);

      if (cards.length > 0) {
        blocks.push({
          kind: "flashcards",
          title: section.title,
          cards,
        });
      }
    } else {
      blocks.push({
        kind: "markdown",
        content: transformMarkdownTables(
          `## ${section.title}\n\n${section.content}`,
        ),
      });
    }

    cursor = section.end;
  }

  const trailing = body.slice(cursor).trim();

  if (trailing) {
    blocks.push({ kind: "markdown", content: trailing });
  }

  return blocks.length > 0 ? blocks : [{ kind: "markdown", content: body }];
}

function extractH2TitlesFromMarkdown(content: string): string[] {
  const regex = /^##\s+(.+?)\s*$/gm;

  return [...content.matchAll(regex)].map((match) => match[1].trim());
}

/** Visible section titles in the same order as the note detail page renders them. */
export function listRenderedVisibleSectionTitles(body: string): string[] {
  const blocks = buildLifeLabNoteContentBlocks(body);
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
