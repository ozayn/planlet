import {
  collectHiddenTechnicalContent,
  isHiddenTechnicalHeading,
  stripPlanletHiddenBlocks,
  stripTechnicalMetadataFromMarkdown,
} from "@/lib/life-lab/hidden-markdown-sections";
import { normalizeLearningMapMermaidInMarkdown } from "@/lib/life-lab/mermaid-direction";
import { listReadingBriefH2Sections } from "@/lib/life-lab/reading-briefs";
import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";

const STRUCTURED_VOCABULARY_HEADINGS = new Set([
  "interesting english words and phrases",
  "interesting words and phrases",
  "persian vocabulary and phrasing",
  "vocabulary and phrasing",
  "english vocabulary and phrasing",
  "dictionary entries",
]);

export const STRUCTURED_VOCABULARY_FIELD_LABELS = [
  "Meaning",
  "Context",
  "Why it is useful",
  "My example sentence",
  "Possible English equivalent",
  "Why it matters",
  "Where I found it",
] as const;

export type LifeLabMarkdownSegment = {
  content: string;
  structuredVocabulary: boolean;
};

function normalizeHeadingLabel(value: string): string {
  return value
    .replace(/[*_`~]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isStructuredVocabularyHeading(value: string): boolean {
  return STRUCTURED_VOCABULARY_HEADINGS.has(normalizeHeadingLabel(value));
}

export function segmentStructuredVocabularyMarkdown(
  content: string,
): LifeLabMarkdownSegment[] {
  const lines = content.split("\n");
  const segments: LifeLabMarkdownSegment[] = [];
  let current: string[] = [];
  let structuredVocabulary = false;
  let structuredHeadingLevel = 0;

  function flush(): void {
    const segmentContent = current.join("\n");

    if (segmentContent) {
      segments.push({ content: segmentContent, structuredVocabulary });
    }

    current = [];
  }

  for (const line of lines) {
    const heading = line.match(/^(#{2,6})\s+(.+?)\s*$/);

    if (
      structuredVocabulary &&
      heading &&
      heading[1]!.length <= structuredHeadingLevel
    ) {
      flush();
      structuredVocabulary = false;
      structuredHeadingLevel = 0;
    }

    if (heading && isStructuredVocabularyHeading(heading[2]!)) {
      if (current.length > 0) {
        flush();
      }

      structuredVocabulary = true;
      structuredHeadingLevel = heading[1]!.length;
    }

    current.push(line);
  }

  flush();
  return segments;
}

export function normalizeStructuredVocabularyFields(content: string): string {
  const labels = STRUCTURED_VOCABULARY_FIELD_LABELS.map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  const fieldLine = new RegExp(
    `^(\\s*(?:(?:[-*+]|\\d+[.)])\\s+)?)\\*?\\*?(${labels}):\\*?\\*?\\s*(.*)$`,
    "i",
  );
  const labelToken = new RegExp(`\\*\\*(?:${labels}):\\*\\*`, "gi");
  const lines = content.split("\n").flatMap((line) => {
    const matches = [...line.matchAll(labelToken)];
    const splitIndexes = matches.flatMap((match, index) => {
      const matchIndex = match.index ?? 0;
      const prefix = line.slice(0, matchIndex);
      const isOnlyListPrefix =
        index === 0 && /^\s*(?:[-*+]|\d+[.)])\s+$/.test(prefix);

      return isOnlyListPrefix ? [] : [matchIndex];
    });

    if (splitIndexes.length === 0) {
      return [line];
    }

    const parts: string[] = [];
    let start = 0;

    for (const splitIndex of splitIndexes) {
      const before = line.slice(start, splitIndex).trimEnd();

      if (before) {
        parts.push(before, "");
      }

      start = splitIndex;
    }

    parts.push(line.slice(start).trimStart());
    return parts;
  });
  const result: string[] = [];

  for (const line of lines) {
    const match = line.match(fieldLine);

    if (!match) {
      result.push(line);
      continue;
    }

    const prefix = match[1] ?? "";
    const label = match[2]!;
    const value = match[3]?.trim() ?? "";
    const isListField = /(?:[-*+]|\d+[.)])\s+$/.test(prefix);

    if (!isListField && result.at(-1)?.trim()) {
      result.push("");
    }

    result.push(`${prefix}**${label}:**${value ? "  " : ""}`);

    if (value) {
      const leadingWhitespace = prefix.match(/^\s*/)?.[0] ?? "";
      result.push(`${isListField ? `${leadingWhitespace}  ` : ""}${value}`);
    }
  }

  return result.join("\n");
}

/** Ensure list blocks start after a blank line so GFM recognizes them. */
export function normalizeMarkdownListSpacing(body: string): string {
  const lines = body.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const previous = result.at(-1);
    const isListItem = /^\s*([-*+]|\d+\.)\s+/.test(line);

    if (
      isListItem &&
      previous?.trim() &&
      !/^\s*([-*+]|\d+\.)\s+/.test(previous) &&
      !/^#{1,6}\s+/.test(previous.trim())
    ) {
      result.push("");
    }

    result.push(line);
  }

  return result.join("\n");
}

export function stripMetadataOnlyTranscriptSections(body: string): string {
  const sections = listReadingBriefH2Sections(body);

  if (sections.length === 0) {
    return body;
  }

  const parts: string[] = [];
  const preambleEnd = sections[0]?.start ?? body.length;
  const preamble = body.slice(0, preambleEnd).trim();

  if (preamble) {
    parts.push(preamble);
  }

  for (const section of sections) {
    if (
      isFullTranscriptSectionTitle(section.title) &&
      isTranscriptMetadataOnly(section.content)
    ) {
      continue;
    }

    if (isHiddenTechnicalHeading(section.title)) {
      continue;
    }

    parts.push(`## ${section.title}\n\n${section.content}`.trim());
  }

  return parts.join("\n\n").trim();
}

export function stripHiddenMarkdownSections(body: string): string {
  const sections = listReadingBriefH2Sections(body);

  if (sections.length === 0) {
    return stripTechnicalMetadataFromMarkdown(body);
  }

  const parts: string[] = [];
  const hiddenParts: string[] = [];
  const preambleEnd = sections[0]?.start ?? body.length;
  const preamble = body.slice(0, preambleEnd).trim();

  if (preamble) {
    const strippedPreamble = stripTechnicalMetadataFromMarkdown(preamble);

    if (strippedPreamble) {
      parts.push(strippedPreamble);
    }

    if (strippedPreamble !== preamble) {
      hiddenParts.push(...collectHiddenTechnicalContent(preamble));
    }
  }

  for (const section of sections) {
    if (isHiddenTechnicalHeading(section.title)) {
      hiddenParts.push(`## ${section.title}\n\n${section.content}`.trim());
      continue;
    }

    const cleanedContent = stripTechnicalMetadataFromMarkdown(section.content);

    if (cleanedContent) {
      parts.push(`## ${section.title}\n\n${cleanedContent}`.trim());
    }
  }

  return parts.join("\n\n").trim();
}

export function extractTechnicalProvenanceForDebug(
  body: string,
  frontmatterNotes: string[] = [],
): string[] {
  const hiddenBlocks = stripPlanletHiddenBlocks(body).hidden;
  const hiddenSections = listReadingBriefH2Sections(body)
    .filter((section) => isHiddenTechnicalHeading(section.title))
    .map((section) => `## ${section.title}\n\n${section.content}`.trim());
  const hiddenParagraphs = collectHiddenTechnicalContent(body);

  const entries = [
    ...frontmatterNotes,
    ...hiddenBlocks,
    ...hiddenSections,
    ...hiddenParagraphs,
  ].filter((entry, index, all) => all.indexOf(entry) === index);
  const normalized = entries.map((entry) =>
    entry
      .toLowerCase()
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/[#*_|`~:\[\]()-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  return entries.filter((_, index) => {
    const value = normalized[index];

    if (!value) {
      return false;
    }

    if (normalized.indexOf(value) !== index) {
      return false;
    }

    return !normalized.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.length > value.length &&
        candidate.includes(value),
    );
  });
}

export function prepareLifeLabMarkdownForReading(body: string): string {
  return normalizeMarkdownListSpacing(
    normalizeLearningMapMermaidInMarkdown(
      stripMetadataOnlyTranscriptSections(stripHiddenMarkdownSections(body)),
    ),
  );
}

export {
  HIDDEN_MARKDOWN_SECTIONS,
  HIDDEN_TECHNICAL_HEADINGS,
  isHiddenMarkdownSection,
  isHiddenTechnicalHeading,
} from "@/lib/life-lab/hidden-markdown-sections";
