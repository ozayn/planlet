import { isHiddenMarkdownSection } from "@/lib/life-lab/hidden-markdown-sections";
import {
  markdownToSpeechText,
  plainTextToSpeechText,
  sanitizeSpeechText,
} from "@/lib/life-lab/speech";

const MERMAID_BLOCK_PATTERN = /```mermaid[\s\S]*?```/gi;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const FLASHCARD_SECTION_PATTERN =
  /^#{1,6}\s+(?:Optional Flashcards|Flashcards|Study Cards)\s*[\r\n]+[\s\S]*$/gim;

const SKIPPED_SECTION_PATTERNS = [
  /^source\s*notes?$/i,
  /^developer information$/i,
  /^processing notes$/i,
  /^internal metadata$/i,
  /^extraction metadata$/i,
  /^visual anchor$/i,
  /^filter\b/i,
  /^debug\b/i,
  /^transcript availability$/i,
  /^drive metadata$/i,
] as const;

const PREFERRED_SECTION_PATTERNS = [
  /^short version$/i,
  /^summary$/i,
  /^core argument$/i,
  /^key ideas?$/i,
  /^people and concepts$/i,
  /^main lessons?$/i,
  /^questions?$/i,
  /^what to remember$/i,
] as const;

export type NarrationSection = {
  label: string;
  body: string;
};

export type NarrationDocumentInput = {
  title: string;
  content: string;
  includeFlashcards?: boolean;
  flashcards?: Array<{ question: string; answer: string }>;
};

function shouldSkipSectionTitle(title: string): boolean {
  const normalized = title.trim();

  if (!normalized) {
    return true;
  }

  if (isHiddenMarkdownSection(normalized)) {
    return true;
  }

  return SKIPPED_SECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function cleanSectionBody(body: string): string {
  return markdownToSpeechText(
    body
      .replace(MERMAID_BLOCK_PATTERN, " ")
      .replace(CODE_BLOCK_PATTERN, " ")
      .replace(FLASHCARD_SECTION_PATTERN, " "),
  );
}

function splitMarkdownSections(content: string): NarrationSection[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const sections: NarrationSection[] = [];
  let currentLabel = "Introduction";
  let currentLines: string[] = [];

  function pushCurrentSection(): void {
    const body = cleanSectionBody(currentLines.join("\n"));

    if (body) {
      sections.push({
        label: currentLabel,
        body,
      });
    }

    currentLines = [];
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);

    if (headingMatch) {
      pushCurrentSection();
      currentLabel = headingMatch[2]?.trim() || "Section";

      if (shouldSkipSectionTitle(currentLabel)) {
        currentLabel = "";
        currentLines = [];
        continue;
      }

      continue;
    }

    if (!currentLabel) {
      continue;
    }

    currentLines.push(line);
  }

  pushCurrentSection();
  return sections;
}

function orderNarrationSections(sections: NarrationSection[]): NarrationSection[] {
  const preferred: NarrationSection[] = [];
  const regular: NarrationSection[] = [];

  for (const section of sections) {
    const isPreferred = PREFERRED_SECTION_PATTERNS.some((pattern) =>
      pattern.test(section.label),
    );

    if (isPreferred) {
      preferred.push(section);
    } else {
      regular.push(section);
    }
  }

  return [...preferred, ...regular];
}

function buildFlashcardSections(
  flashcards: Array<{ question: string; answer: string }>,
): NarrationSection[] {
  const lines: string[] = [];

  flashcards.forEach((card, index) => {
    const question = plainTextToSpeechText(card.question);
    const answer = plainTextToSpeechText(card.answer);

    if (!question) {
      return;
    }

    lines.push(`Flashcard ${index + 1}. Question. ${question}.`);

    if (answer) {
      lines.push(`Answer. ${answer}.`);
    }
  });

  const body = sanitizeSpeechText(lines.join(" "));

  if (!body) {
    return [];
  }

  return [{ label: "Flashcards", body }];
}

export function buildNarrationDocument(
  input: NarrationDocumentInput,
): NarrationSection[] {
  const title = sanitizeSpeechText(input.title.trim());
  const sections: NarrationSection[] = [];

  if (title) {
    sections.push({ label: "Title", body: title });
  }

  const markdownSections = orderNarrationSections(
    splitMarkdownSections(input.content),
  );

  sections.push(...markdownSections);

  if (input.includeFlashcards && input.flashcards?.length) {
    sections.push(...buildFlashcardSections(input.flashcards));
  }

  return sections.filter((section) => section.body.trim().length > 0);
}

export function narrationDocumentToPlainText(
  sections: NarrationSection[],
): string {
  return sections
    .map((section) => `${section.label}. ${section.body}`)
    .join("\n\n");
}
