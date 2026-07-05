import type { LifeLabFlashcard, LifeLabNoteMetadata } from "@/lib/life-lab/constants";

const FLASHCARD_SECTION_HEADINGS = [
  "optional flashcards",
  "flashcards",
  "study cards",
] as const;

function normalizeCardText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

    const questionMatch = trimmed.match(
      /^(?:-\s*)?Q:\s*(.+)$/i,
    );
    const answerMatch = trimmed.match(
      /^(?:-\s*)?A:\s*(.+)$/i,
    );

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
      currentAnswerLines.push(trimmed);
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

      if (
        FLASHCARD_SECTION_HEADINGS.includes(
          heading as (typeof FLASHCARD_SECTION_HEADINGS)[number],
        )
      ) {
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
