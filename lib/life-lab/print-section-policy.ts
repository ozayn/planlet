import { isFlashcardSectionTitle } from "@/lib/life-lab/flashcards";
import { isHiddenTechnicalHeading } from "@/lib/life-lab/hidden-markdown-sections";

/**
 * Central policy for Life Lab note PDF/print export.
 * Prefer this over ad-hoc heading checks in page components.
 */
export type LifeLabPrintSectionDecision = "include" | "exclude" | "optional";

const EXCLUDED_STUDY_HEADING_PATTERNS: RegExp[] = [
  /^questions?\s+for\s+later$/i,
  /^practice\s+questions?$/i,
  /^comprehension\s+questions?$/i,
  /^discussion\s+questions?$/i,
  /^reflection\s+questions?$/i,
  /^self[- ]?check$/i,
  /^quiz(?:zes)?$/i,
  /^q\s*&\s*a$/i,
  /^q\s*and\s*a$/i,
  /^study\s+questions?$/i,
  /^review\s+questions?$/i,
  /^check\s+your\s+understanding$/i,
];

const EXCLUDED_TECHNICAL_EXTRA_PATTERNS: RegExp[] = [
  /^debug(?:\s+information)?$/i,
  /^metadata$/i,
  /^internal\s+status$/i,
  /^sync\s+details$/i,
  /^transcript\s+source$/i,
];

/** Dictionary candidate lists are study tooling, not reading content. */
const EXCLUDED_DICTIONARY_PATTERNS: RegExp[] = [
  /^dictionary\s+candidates$/i,
  /^candidate\s+entries$/i,
];

function normalizeHeading(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

/**
 * Decide whether an H2 section belongs in a clean study/reference PDF.
 * Technical headings reuse the shared reading filter.
 */
export function resolveLifeLabPrintSectionDecision(
  title: string,
): LifeLabPrintSectionDecision {
  const normalized = normalizeHeading(title);

  if (!normalized) {
    return "exclude";
  }

  if (isHiddenTechnicalHeading(normalized)) {
    return "exclude";
  }

  if (isFlashcardSectionTitle(normalized)) {
    return "exclude";
  }

  if (
    EXCLUDED_STUDY_HEADING_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return "exclude";
  }

  if (
    EXCLUDED_TECHNICAL_EXTRA_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    return "exclude";
  }

  if (
    EXCLUDED_DICTIONARY_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return "exclude";
  }

  return "include";
}

export function shouldIncludeSectionInLifeLabPrint(title: string): boolean {
  return resolveLifeLabPrintSectionDecision(title) === "include";
}

export function shouldExcludeSectionFromLifeLabPrint(title: string): boolean {
  return resolveLifeLabPrintSectionDecision(title) === "exclude";
}
