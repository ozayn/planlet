import { isHiddenMarkdownSection } from "@/lib/life-lab/hidden-markdown-sections";
import { normalizeLearningMapMermaidInMarkdown } from "@/lib/life-lab/mermaid-direction";
import { listReadingBriefH2Sections } from "@/lib/life-lab/reading-briefs";
import {
  isFullTranscriptSectionTitle,
  isTranscriptMetadataOnly,
} from "@/lib/life-lab/transcript-sections";

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

    if (isHiddenMarkdownSection(section.title)) {
      continue;
    }

    parts.push(`## ${section.title}\n\n${section.content}`.trim());
  }

  return parts.join("\n\n").trim();
}

export function stripHiddenMarkdownSections(body: string): string {
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
    if (isHiddenMarkdownSection(section.title)) {
      continue;
    }

    parts.push(`## ${section.title}\n\n${section.content}`.trim());
  }

  return parts.join("\n\n").trim();
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
  isHiddenMarkdownSection,
} from "@/lib/life-lab/hidden-markdown-sections";
