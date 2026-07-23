import type { LifeLabFlashcard, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import {
  isMemoNextDeckText,
  parseMemoNextDeck,
} from "@/lib/life-lab/memonext-deck";

export const FLASHCARD_SECTION_HEADINGS = [
  "optional flashcards",
  "flashcards",
  "study cards",
] as const;

const FLASHCARD_SECTION_TITLES = new Set<string>(FLASHCARD_SECTION_HEADINGS);

function normalizeCardText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripListMarker(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, "");
}

function parseInlineQaPair(line: string): LifeLabFlashcard | null {
  const normalized = stripListMarker(line);
  const match = normalized.match(/^Q:\s*(.+?)\s+A:\s*(.+)$/i);

  if (!match) {
    return null;
  }

  const question = normalizeCardText(match[1]);
  const answer = normalizeCardText(match[2]);

  if (!question || !answer) {
    return null;
  }

  return { question, answer, cardType: "qa" };
}

function extractQaPairs(text: string): LifeLabFlashcard[] {
  const parsed = parseMemoNextDeck(text);
  return parsed.cards;
}

function extractFlashcardSection(body: string): string | null {
  const lines = body.split("\n");
  let inSection = false;
  let sectionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);

    if (headingMatch) {
      const heading = headingMatch[1].trim().toLowerCase();

      if (FLASHCARD_SECTION_TITLES.has(heading)) {
        inSection = true;
        sectionLines = [];
        continue;
      }

      if (inSection) {
        break;
      }
    }

    if (inSection) {
      sectionLines.push(line);
    }
  }

  if (!inSection || sectionLines.length === 0) {
    return null;
  }

  return sectionLines.join("\n");
}

export function isFlashcardSectionTitle(title: string): boolean {
  return FLASHCARD_SECTION_TITLES.has(title.trim().toLowerCase());
}

export function extractFlashcardsFromSectionText(
  sectionText: string,
): LifeLabFlashcard[] {
  return extractQaPairs(sectionText);
}

export function extractFlashcardsFromMarkdown(
  body: string,
): LifeLabFlashcard[] {
  const sectionText = extractFlashcardSection(body);

  if (sectionText) {
    return extractQaPairs(sectionText);
  }

  if (isMemoNextDeckText(body)) {
    return parseMemoNextDeck(body).cards;
  }

  return [];
}

export function noteHasFlashcards(
  _metadata: LifeLabNoteMetadata,
  body: string,
): boolean {
  return extractFlashcardsFromMarkdown(body).length > 0;
}

export function resolveFlashcardDeckPathFromMetadata(
  metadata: LifeLabNoteMetadata | undefined,
): string | null {
  if (!metadata) {
    return null;
  }

  const candidates = [
    metadata.flashcard_deck,
    metadata.flashcardDeck,
    metadata.flashcards_path,
    metadata.flashcardsPath,
    metadata.deck_path,
    metadata.deckPath,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export { parseInlineQaPair };
