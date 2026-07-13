import { isHiddenTechnicalHeading } from "@/lib/life-lab/hidden-markdown-sections";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";
import { isSameNarrationTitle } from "@/lib/life-lab/narration-title";
import {
  markdownToSpeechText,
  plainTextToSpeechText,
  sanitizeSpeechText,
} from "@/lib/life-lab/speech";

const MERMAID_BLOCK_PATTERN = /```mermaid[\s\S]*?```/gi;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const FLASHCARD_SECTION_PATTERN =
  /^#{1,6}\s+(?:Optional Flashcards|Flashcards|Study Cards)\s*[\r\n]+[\s\S]*$/gim;

export const READ_ALOUD_SECTION_CATEGORY_IDS = [
  "SHORT_VERSION",
  "SUMMARY",
  "CORE_ARGUMENT",
  "KEY_IDEAS",
  "PEOPLE_CONCEPTS",
  "MAIN_LESSONS",
  "QUESTIONS",
  "WHAT_TO_REMEMBER",
  "TIMELINE",
  "FLASHCARDS",
  "FULL_TRANSCRIPT",
  "NOTE_TITLE",
  "OTHER",
] as const;

export type ReadAloudSectionCategory =
  (typeof READ_ALOUD_SECTION_CATEGORY_IDS)[number];

export type ReadAloudSection = {
  id: string;
  title: string;
  text: string;
  order: number;
  /** Encounter order in the source document before inclusion filtering. */
  documentOrder: number;
  category: ReadAloudSectionCategory;
};

export type ReadAloudSectionInclusionPrefs = {
  shortVersion: boolean;
  summary: boolean;
  coreArgument: boolean;
  keyIdeas: boolean;
  mainLessons: boolean;
  whatToRemember: boolean;
  peopleConcepts: boolean;
  timeline: boolean;
  questions: boolean;
  flashcards: boolean;
  fullTranscript: boolean;
};

export const DEFAULT_READ_ALOUD_SECTION_INCLUSION: ReadAloudSectionInclusionPrefs =
  {
    shortVersion: true,
    summary: true,
    coreArgument: true,
    keyIdeas: true,
    mainLessons: true,
    whatToRemember: true,
    peopleConcepts: false,
    timeline: false,
    questions: false,
    flashcards: false,
    fullTranscript: false,
  };

export type BuildReadAloudSectionsInput = {
  title: string;
  content: string;
  flashcards?: Array<{ question: string; answer: string }>;
  inclusion?: Partial<ReadAloudSectionInclusionPrefs>;
};

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
  /^technical details$/i,
  /^hidden content$/i,
] as const;

const CATEGORY_PATTERNS: Array<{
  category: ReadAloudSectionCategory;
  pattern: RegExp;
}> = [
  { category: "SHORT_VERSION", pattern: /^short version$/i },
  { category: "SUMMARY", pattern: /^summary$/i },
  { category: "CORE_ARGUMENT", pattern: /^core argument$/i },
  { category: "KEY_IDEAS", pattern: /^key ideas?$/i },
  {
    category: "PEOPLE_CONCEPTS",
    pattern: /^people(?:\s*(?:\/|and)\s*concepts| and concepts)?$/i,
  },
  { category: "MAIN_LESSONS", pattern: /^main lessons?$/i },
  { category: "QUESTIONS", pattern: /^questions?$/i },
  { category: "WHAT_TO_REMEMBER", pattern: /^what to remember$/i },
  { category: "TIMELINE", pattern: /^timeline$/i },
  { category: "FULL_TRANSCRIPT", pattern: /^full transcript$/i },
  {
    category: "FLASHCARDS",
    pattern: /^(?:optional flashcards|flashcards|study cards)$/i,
  },
];

function normalizeHeadingTitle(value: string): string {
  return value
    .trim()
    .replace(/[:#]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Strip a leading H1 that matches the document title.
 * Returns remaining markdown and any body text that lived under that H1.
 */
export function stripMatchingDocumentTitleHeading(
  content: string,
  documentTitle: string,
): { content: string; matchingH1Body: string } {
  const normalized = content.replace(/\r\n/g, "\n");

  if (!documentTitle.trim()) {
    return { content: normalized, matchingH1Body: "" };
  }

  const match = normalized.match(/^\s*(#)\s+(.+?)\s*#*\s*(?:\n+|$)([\s\S]*)$/);

  if (!match) {
    return { content: normalized, matchingH1Body: "" };
  }

  const headingText = match[2]?.trim() ?? "";

  if (!isSameNarrationTitle(documentTitle, headingText)) {
    return { content: normalized, matchingH1Body: "" };
  }

  const afterHeading = match[3] ?? "";
  const nextHeadingIndex = afterHeading.search(/^#{1,6}\s+/m);

  if (nextHeadingIndex < 0) {
    const body = cleanSectionBody(afterHeading);
    return { content: "", matchingH1Body: body };
  }

  if (nextHeadingIndex === 0) {
    return { content: afterHeading, matchingH1Body: "" };
  }

  const bodyMarkdown = afterHeading.slice(0, nextHeadingIndex);
  const rest = afterHeading.slice(nextHeadingIndex);
  return {
    content: rest,
    matchingH1Body: cleanSectionBody(bodyMarkdown),
  };
}

function slugifyHeading(value: string): string {
  return normalizeHeadingTitle(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function categorizeReadAloudSectionTitle(
  title: string,
): ReadAloudSectionCategory {
  const normalized = normalizeHeadingTitle(title);

  for (const entry of CATEGORY_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return entry.category;
    }
  }

  return "OTHER";
}

function shouldSkipSectionTitle(title: string): boolean {
  const normalized = title.trim();

  if (!normalized) {
    return true;
  }

  if (isHiddenTechnicalHeading(normalized)) {
    return true;
  }

  return SKIPPED_SECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isCategoryIncluded(
  category: ReadAloudSectionCategory,
  inclusion: ReadAloudSectionInclusionPrefs,
): boolean {
  switch (category) {
    case "SHORT_VERSION":
      return inclusion.shortVersion;
    case "SUMMARY":
      return inclusion.summary;
    case "CORE_ARGUMENT":
      return inclusion.coreArgument;
    case "KEY_IDEAS":
      return inclusion.keyIdeas;
    case "PEOPLE_CONCEPTS":
      return inclusion.peopleConcepts;
    case "MAIN_LESSONS":
      return inclusion.mainLessons;
    case "QUESTIONS":
      return inclusion.questions;
    case "WHAT_TO_REMEMBER":
      return inclusion.whatToRemember;
    case "TIMELINE":
      return inclusion.timeline;
    case "FULL_TRANSCRIPT":
      return inclusion.fullTranscript;
    case "FLASHCARDS":
      return inclusion.flashcards;
    case "NOTE_TITLE":
    case "OTHER":
      return true;
    default:
      return true;
  }
}

function cleanSectionBody(body: string): string {
  return markdownToSpeechText(
    body
      .replace(MERMAID_BLOCK_PATTERN, " ")
      .replace(CODE_BLOCK_PATTERN, " ")
      .replace(FLASHCARD_SECTION_PATTERN, " "),
  );
}

function resolveInclusion(
  inclusion?: Partial<ReadAloudSectionInclusionPrefs>,
): ReadAloudSectionInclusionPrefs {
  return {
    ...DEFAULT_READ_ALOUD_SECTION_INCLUSION,
    ...inclusion,
  };
}

function createStableSectionIds(
  sections: Array<{ title: string; category: ReadAloudSectionCategory }>,
): string[] {
  const seen = new Map<string, number>();

  return sections.map((section) => {
    const base = slugifyHeading(section.title) || "untitled-section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    if (count === 0) {
      return base;
    }

    return `${base}-${count + 1}`;
  });
}

function splitMarkdownSections(content: string): Array<{
  title: string;
  text: string;
  category: ReadAloudSectionCategory;
  documentOrder: number;
}> {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const sections: Array<{
    title: string;
    text: string;
    category: ReadAloudSectionCategory;
    documentOrder: number;
  }> = [];
  let currentTitle = "";
  let currentLines: string[] = [];
  let nextDocumentOrder = 0;

  function pushCurrentSection(): void {
    if (!currentTitle) {
      currentLines = [];
      return;
    }

    const text = cleanSectionBody(currentLines.join("\n"));

    if (text) {
      sections.push({
        title: currentTitle,
        text,
        category: categorizeReadAloudSectionTitle(currentTitle),
        documentOrder: nextDocumentOrder,
      });
      nextDocumentOrder += 1;
    }

    currentLines = [];
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);

    if (headingMatch) {
      pushCurrentSection();
      currentTitle = headingMatch[2]?.trim() || "Untitled section";

      if (shouldSkipSectionTitle(currentTitle)) {
        currentTitle = "";
        currentLines = [];
        continue;
      }

      continue;
    }

    if (!currentTitle) {
      continue;
    }

    currentLines.push(line);
  }

  pushCurrentSection();
  return sections;
}

export function listMarkdownReadableSectionTitles(content: string): string[] {
  return splitMarkdownSections(prepareLifeLabMarkdownForReading(content)).map(
    (section) => section.title,
  );
}

export function getReadAloudSectionIds(
  input: BuildReadAloudSectionsInput,
): string[] {
  return buildReadAloudSections(input).map((section) => section.id);
}

function buildFlashcardSection(
  flashcards: Array<{ question: string; answer: string }>,
): { title: string; text: string; category: ReadAloudSectionCategory } | null {
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

  const text = sanitizeSpeechText(lines.join(" "));

  if (!text) {
    return null;
  }

  return {
    title: "Flashcards",
    text,
    category: "FLASHCARDS",
  };
}

export function buildReadAloudSections(
  input: BuildReadAloudSectionsInput,
): ReadAloudSection[] {
  const inclusion = resolveInclusion(input.inclusion);
  const documentTitle = sanitizeSpeechText(input.title.trim());
  const prepared = prepareLifeLabMarkdownForReading(input.content);
  const { content: contentWithoutMatchingH1, matchingH1Body } =
    stripMatchingDocumentTitleHeading(prepared, documentTitle);
  const markdownSections = splitMarkdownSections(contentWithoutMatchingH1);

  // If stripping failed to apply but the first parsed section title matches,
  // drop that section's heading echo (keep body as title preamble when needed).
  let bodySections = markdownSections;
  let titlePreamble = matchingH1Body;

  if (
    bodySections[0] &&
    documentTitle &&
    isSameNarrationTitle(documentTitle, bodySections[0].title)
  ) {
    const [first, ...rest] = bodySections;

    if (!first.text.trim() || isSameNarrationTitle(documentTitle, first.text)) {
      bodySections = rest;
    } else if (!titlePreamble) {
      titlePreamble = first.text;
      bodySections = rest;
    } else {
      bodySections = rest;
    }
  }

  const draft: Array<Omit<ReadAloudSection, "order" | "id">> = [];
  const includeDocumentTitle = documentTitle.length > 0;
  const titleOffset = includeDocumentTitle ? 1 : 0;

  if (includeDocumentTitle) {
    draft.push({
      title: documentTitle,
      // Never set text to the title itself — chunk builder would speak it twice.
      text: titlePreamble,
      category: "NOTE_TITLE",
      documentOrder: 0,
    });
  }

  for (const section of bodySections) {
    draft.push({
      title: section.title,
      text: section.text,
      category: section.category,
      documentOrder: section.documentOrder + titleOffset,
    });
  }

  const flashcardSection = input.flashcards?.length
    ? buildFlashcardSection(input.flashcards)
    : null;

  if (flashcardSection) {
    draft.push({
      title: flashcardSection.title,
      text: flashcardSection.text,
      category: flashcardSection.category,
      documentOrder: titleOffset + bodySections.length,
    });
  }

  const filtered = draft.filter((section) =>
    isCategoryIncluded(section.category, inclusion),
  );

  const ids = createStableSectionIds(filtered);

  return filtered.map((section, index) => ({
    ...section,
    id: ids[index] ?? `section-${index + 1}`,
    order: index + 1,
  }));
}

export function findReadAloudSectionIndex(
  sections: ReadAloudSection[],
  sectionId: string | null | undefined,
): number {
  if (!sectionId) {
    return 0;
  }

  const index = sections.findIndex((section) => section.id === sectionId);

  return index >= 0 ? index : 0;
}

export function normalizeReadAloudSectionInclusion(
  value: unknown,
): ReadAloudSectionInclusionPrefs {
  if (!value || typeof value !== "object") {
    return DEFAULT_READ_ALOUD_SECTION_INCLUSION;
  }

  const record = value as Partial<ReadAloudSectionInclusionPrefs>;

  return {
    shortVersion:
      record.shortVersion ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.shortVersion,
    summary: record.summary ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.summary,
    coreArgument:
      record.coreArgument ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.coreArgument,
    keyIdeas: record.keyIdeas ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.keyIdeas,
    mainLessons:
      record.mainLessons ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.mainLessons,
    whatToRemember:
      record.whatToRemember ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.whatToRemember,
    peopleConcepts:
      record.peopleConcepts ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.peopleConcepts,
    timeline: record.timeline ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.timeline,
    questions: record.questions ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.questions,
    flashcards:
      record.flashcards ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.flashcards,
    fullTranscript:
      record.fullTranscript ?? DEFAULT_READ_ALOUD_SECTION_INCLUSION.fullTranscript,
  };
}

export function readAloudSectionsToPlainText(sections: ReadAloudSection[]): string {
  return sections
    .map((section) => {
      if (section.category === "NOTE_TITLE") {
        if (!section.text.trim() || isSameNarrationTitle(section.title, section.text)) {
          return section.title;
        }

        return `${section.title}. ${section.text}`;
      }

      if (!section.text.trim()) {
        return section.title;
      }

      if (isSameNarrationTitle(section.title, section.text)) {
        return section.title;
      }

      return `${section.title}. ${section.text}`;
    })
    .join("\n\n");
}
