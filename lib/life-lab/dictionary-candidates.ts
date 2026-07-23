import { markdownExcerpt } from "@/lib/life-lab/slug";
import {
  extractFlashcardsFromSectionText,
  isFlashcardSectionTitle,
} from "@/lib/life-lab/flashcards";
import { isHiddenMarkdownSection } from "@/lib/life-lab/hidden-markdown-sections";
import { transformMarkdownTables } from "@/lib/life-lab/reading-briefs";
import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";
import type { LifeLabFlashcard } from "@/lib/life-lab/constants";

export const DICTIONARY_CANDIDATES_SECTION_TITLE = "Dictionary candidates";

export const DICTIONARY_STUDY_SECTION_TITLES = [
  DICTIONARY_CANDIDATES_SECTION_TITLE,
  "Vocabulary and phrasing",
  "Names and concepts to remember",
] as const;

export type DictionaryStudySectionKind =
  | "candidates"
  | "vocabulary"
  | "names"
  | "other";

export type DictionaryStudySection = {
  title: string;
  content: string;
  kind: DictionaryStudySectionKind;
};

export type DictionaryNoteContentBlock =
  | { kind: "markdown"; content: string }
  | { kind: "dictionary-section"; section: DictionaryStudySection }
  | { kind: "flashcards"; cards: LifeLabFlashcard[]; title: string }
  | { kind: "transcript"; content: string; title: string };

function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

function classifyDictionaryStudySection(title: string): DictionaryStudySectionKind {
  const normalized = normalizeSectionTitle(title);

  if (normalized === normalizeSectionTitle(DICTIONARY_CANDIDATES_SECTION_TITLE)) {
    return "candidates";
  }

  if (normalized === "vocabulary and phrasing") {
    return "vocabulary";
  }

  if (normalized === "names and concepts to remember") {
    return "names";
  }

  return "other";
}

export { classifyDictionaryStudySection };

export function isDictionaryStudySectionTitle(title: string): boolean {
  return DICTIONARY_STUDY_SECTION_TITLES.some(
    (candidate) => normalizeSectionTitle(candidate) === normalizeSectionTitle(title),
  );
}

export function isDictionaryCandidatesSectionTitle(title: string): boolean {
  return (
    normalizeSectionTitle(title) ===
    normalizeSectionTitle(DICTIONARY_CANDIDATES_SECTION_TITLE)
  );
}

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

export function extractDictionaryStudySections(
  body: string,
): DictionaryStudySection[] {
  return listMarkdownH2Sections(body)
    .filter((section) => isDictionaryStudySectionTitle(section.title))
    .map((section) => ({
      title: section.title,
      content: section.content,
      kind: classifyDictionaryStudySection(section.title),
    }));
}

export function extractDictionaryCandidatesSection(
  body: string,
): DictionaryStudySection | null {
  return (
    extractDictionaryStudySections(body).find(
      (section) => section.kind === "candidates",
    ) ?? null
  );
}

export function hasDictionaryStudySections(body: string): boolean {
  return extractDictionaryStudySections(body).length > 0;
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}/.test(line.trim());
}

export function summarizeDictionaryCandidates(
  content: string,
  maxItems = 4,
): string[] {
  return listDictionaryCandidateTerms(content).slice(0, maxItems);
}

export function listDictionaryCandidateTerms(content: string): string[] {
  const items: string[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);

    if (bulletMatch?.[1]) {
      const raw = bulletMatch[1].trim();

      if (
        /^(?:\*\*)?(?:Meaning|Context|Why it is useful|My example sentence|Possible English equivalent|Why it matters|Where I found it):/i.test(
          raw,
        )
      ) {
        continue;
      }

      const boldTerm = raw.match(/^\*\*([^*]+)\*\*/)?.[1];
      const linkedTerm = raw.match(/^\[([^\]]+)]\([^)]*\)/)?.[1];
      const term =
        boldTerm ??
        linkedTerm ??
        raw.split(/\s+(?:—|–|-)\s+|\s*:\s+/, 1)[0] ??
        raw;

      items.push(markdownExcerpt(term, 72));
      continue;
    }

    if (isTableRow(trimmed) && !isTableSeparator(trimmed)) {
      const cells = parseTableRow(trimmed);

      if (cells[0] && !/^item$/i.test(cells[0])) {
        items.push(markdownExcerpt(cells[0], 72));
      }
    }

  }

  return items.filter(
    (item, index, all) =>
      item.trim() && all.findIndex((candidate) => candidate === item) === index,
  );
}

export function buildDictionaryCandidatesCopyPrompt(input: {
  noteTitle: string;
  content: string;
}): string {
  const trimmed = input.content.trim();

  return [
    "Add these dictionary candidates from this note to my Learning Dictionary:",
    "",
    `Note: ${input.noteTitle.trim()}`,
    "",
    trimmed,
  ].join("\n");
}

export function buildDictionaryNoteContentBlocks(
  body: string,
): DictionaryNoteContentBlock[] {
  const sections = listMarkdownH2Sections(body);

  if (
    !sections.some((section) => isDictionaryStudySectionTitle(section.title))
  ) {
    return [{ kind: "markdown", content: body }];
  }

  const blocks: DictionaryNoteContentBlock[] = [];
  let cursor = 0;

  for (const section of sections) {
    const before = body.slice(cursor, section.start).trim();

    if (before) {
      blocks.push({ kind: "markdown", content: before });
    }

    if (isDictionaryStudySectionTitle(section.title)) {
      blocks.push({
        kind: "dictionary-section",
        section: {
          title: section.title,
          content: transformMarkdownTables(section.content),
          kind: classifyDictionaryStudySection(section.title),
        },
      });
    } else if (
      isFullTranscriptSectionTitle(section.title) &&
      !isTranscriptMetadataOnly(section.content)
    ) {
      blocks.push({
        kind: "transcript",
        title: section.title,
        content: transformMarkdownTables(section.content),
      });
    } else if (isFlashcardSectionTitle(section.title)) {
      const cards = extractFlashcardsFromSectionText(section.content);

      if (cards.length > 0) {
        blocks.push({
          kind: "flashcards",
          title: section.title,
          cards,
        });
      }
    } else if (!isHiddenMarkdownSection(section.title)) {
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
