import type { LifeLabFlashcard, LifeLabNoteMetadata } from "@/lib/life-lab/constants";

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

  return { question, answer };
}

function extractQaPairs(text: string): LifeLabFlashcard[] {
  const cards: LifeLabFlashcard[] = [];
  const lines = text.split("\n");
  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];

  function pushCard(): void {
    if (!currentQuestion) {
      return;
    }

    const answer = normalizeCardText(currentAnswerLines.join(" "));

    if (!answer) {
      currentQuestion = null;
      currentAnswerLines = [];
      return;
    }

    cards.push({
      question: currentQuestion,
      answer,
    });
    currentQuestion = null;
    currentAnswerLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const inlineCard = parseInlineQaPair(trimmed);

    if (inlineCard) {
      pushCard();
      cards.push(inlineCard);
      continue;
    }

    const questionMatch = trimmed.match(/^(?:-\s*)?Q:\s*(.+)$/i);
    const answerMatch = trimmed.match(/^(?:-\s*)?A:\s*(.+)$/i);

    if (questionMatch) {
      pushCard();
      currentQuestion = normalizeCardText(questionMatch[1]);
      currentAnswerLines = [];
      continue;
    }

    if (answerMatch && currentQuestion) {
      currentAnswerLines.push(answerMatch[1]);
      continue;
    }

    if (currentQuestion && currentAnswerLines.length > 0) {
      currentAnswerLines.push(stripListMarker(trimmed));
    }
  }

  pushCard();

  return cards;
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

  if (!sectionText) {
    return [];
  }

  return extractQaPairs(sectionText);
}

export function noteHasFlashcards(
  _metadata: LifeLabNoteMetadata,
  body: string,
): boolean {
  return extractFlashcardsFromMarkdown(body).length > 0;
}
