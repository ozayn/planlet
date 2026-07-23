import type {
  LifeLabFlashcard,
  LifeLabFlashcardType,
} from "@/lib/life-lab/constants";

export type MemoNextDeckHeader = {
  title?: string;
  category?: string;
  source?: string;
  cards?: number;
  lifeLabNote?: string;
  language?: string;
  tags?: string[];
};

export type MemoNextParseIssue = {
  line: number;
  message: string;
};

export type MemoNextDeckParseResult = {
  headers: MemoNextDeckHeader;
  cards: LifeLabFlashcard[];
  issues: MemoNextParseIssue[];
  rawHeaders: string[];
};

const HEADER_PATTERN =
  /^(TITLE|CATEGORY|SOURCE|CARDS|LIFE_LAB_NOTE|LANGUAGE|TAGS|TYPE)\s*:\s*(.*)$/i;

const CARD_TYPE_ALIASES: Record<string, LifeLabFlashcardType> = {
  concept: "concept",
  vocabulary: "vocabulary",
  vocab: "vocabulary",
  process: "process",
  timeline: "timeline",
  person: "person",
  comparison: "comparison",
  diagram: "diagram",
  "fill-in-the-blank": "fill-in-the-blank",
  fill: "fill-in-the-blank",
  qa: "qa",
  "q/a": "qa",
};

function normalizeCardText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripListMarker(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, "");
}

function parseCardType(value: string | undefined): LifeLabFlashcardType | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return CARD_TYPE_ALIASES[value.trim().toLowerCase()];
}

function looksLikeMemoNextHeader(line: string): boolean {
  return HEADER_PATTERN.test(line.trim());
}

export function isMemoNextDeckText(raw: string): boolean {
  const trimmed = raw.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("---")) {
    return false;
  }

  const lines = trimmed.split(/\r?\n/).slice(0, 20);
  let headerHits = 0;
  let qaHits = 0;

  for (const line of lines) {
    const normalized = stripListMarker(line);

    if (!normalized) {
      continue;
    }

    if (looksLikeMemoNextHeader(normalized)) {
      headerHits += 1;
    }

    if (/^(?:-\s*)?Q:\s+/i.test(normalized)) {
      qaHits += 1;
    }
  }

  return headerHits >= 1 || qaHits >= 1;
}

function parseHeaderBlock(lines: string[]): {
  headers: MemoNextDeckHeader;
  rawHeaders: string[];
  consumed: number;
} {
  const headers: MemoNextDeckHeader = {};
  const rawHeaders: string[] = [];
  let consumed = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      consumed += 1;
      continue;
    }

    const match = trimmed.match(HEADER_PATTERN);

    if (!match) {
      break;
    }

    const key = match[1]!.toUpperCase();
    const value = match[2]!.trim();
    rawHeaders.push(trimmed);
    consumed += 1;

    switch (key) {
      case "TITLE":
        headers.title = value || undefined;
        break;
      case "CATEGORY":
        headers.category = value || undefined;
        break;
      case "SOURCE":
        headers.source = value || undefined;
        break;
      case "CARDS": {
        const parsed = Number.parseInt(value, 10);
        headers.cards = Number.isFinite(parsed) ? parsed : undefined;
        break;
      }
      case "LIFE_LAB_NOTE":
        headers.lifeLabNote = value || undefined;
        break;
      case "LANGUAGE":
        headers.language = value || undefined;
        break;
      case "TAGS":
        headers.tags = value
          ? value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined;
        break;
      default:
        break;
    }
  }

  return { headers, rawHeaders, consumed };
}

export function parseMemoNextDeck(raw: string): MemoNextDeckParseResult {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const { headers, rawHeaders, consumed } = parseHeaderBlock(lines);
  const cards: LifeLabFlashcard[] = [];
  const issues: MemoNextParseIssue[] = [];

  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];
  let currentExampleLines: string[] = [];
  let currentContextLines: string[] = [];
  let currentType: LifeLabFlashcardType | undefined;
  let currentTerm: string | undefined;
  let collecting: "answer" | "example" | "context" | null = null;
  let questionLine = 0;

  function resetCard(): void {
    currentQuestion = null;
    currentAnswerLines = [];
    currentExampleLines = [];
    currentContextLines = [];
    currentType = undefined;
    currentTerm = undefined;
    collecting = null;
    questionLine = 0;
  }

  function pushCard(endLine: number): void {
    if (!currentQuestion) {
      resetCard();
      return;
    }

    const answer = normalizeCardText(currentAnswerLines.join("\n"));

    if (!answer) {
      issues.push({
        line: questionLine || endLine,
        message: `Incomplete card for question “${currentQuestion.slice(0, 80)}” — missing answer.`,
      });
      resetCard();
      return;
    }

    const example = normalizeCardText(currentExampleLines.join("\n"));
    const context = normalizeCardText(currentContextLines.join("\n"));

    cards.push({
      question: currentQuestion,
      answer,
      example: example || undefined,
      context: context || undefined,
      cardType: currentType ?? "qa",
      term: currentTerm,
    });

    resetCard();
  }

  for (let index = consumed; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    if (looksLikeMemoNextHeader(trimmed) && !currentQuestion) {
      continue;
    }

    const typeMatch = trimmed.match(/^(?:-\s*)?TYPE:\s*(.+)$/i);
    if (typeMatch && !currentQuestion) {
      currentType = parseCardType(typeMatch[1]);
      continue;
    }

    const termMatch = trimmed.match(/^(?:-\s*)?TERM:\s*(.+)$/i);
    if (termMatch && !currentQuestion) {
      currentTerm = normalizeCardText(termMatch[1] ?? "") || undefined;
      continue;
    }

    const inlineMatch = stripListMarker(trimmed).match(
      /^Q:\s*(.+?)\s+A:\s*(.+)$/i,
    );

    if (inlineMatch) {
      pushCard(lineNumber);
      const question = normalizeCardText(inlineMatch[1] ?? "");
      const answer = normalizeCardText(inlineMatch[2] ?? "");

      if (!question || !answer) {
        issues.push({
          line: lineNumber,
          message: "Skipped incomplete inline Q/A card.",
        });
        continue;
      }

      cards.push({
        question,
        answer,
        cardType: currentType ?? "qa",
      });
      currentType = undefined;
      continue;
    }

    const questionMatch = trimmed.match(/^(?:-\s*)?Q:\s*(.+)$/i);
    if (questionMatch) {
      pushCard(lineNumber);
      currentQuestion = normalizeCardText(questionMatch[1] ?? "");
      questionLine = lineNumber;
      collecting = null;
      continue;
    }

    const answerMatch = trimmed.match(/^(?:-\s*)?A:\s*(.*)$/i);
    if (answerMatch) {
      if (!currentQuestion) {
        issues.push({
          line: lineNumber,
          message: "Answer without a preceding question was ignored.",
        });
        continue;
      }

      collecting = "answer";
      const value = answerMatch[1]?.trim() ?? "";
      currentAnswerLines = value ? [value] : [];
      continue;
    }

    const exampleMatch = trimmed.match(/^(?:-\s*)?EXAMPLE:\s*(.*)$/i);
    if (exampleMatch && currentQuestion) {
      collecting = "example";
      const value = exampleMatch[1]?.trim() ?? "";
      currentExampleLines = value ? [value] : [];
      continue;
    }

    const contextMatch = trimmed.match(/^(?:-\s*)?CONTEXT:\s*(.*)$/i);
    if (contextMatch && currentQuestion) {
      collecting = "context";
      const value = contextMatch[1]?.trim() ?? "";
      currentContextLines = value ? [value] : [];
      continue;
    }

    if (!currentQuestion) {
      continue;
    }

    const continuation = stripListMarker(trimmed);

    if (collecting === "answer") {
      currentAnswerLines.push(continuation);
    } else if (collecting === "example") {
      currentExampleLines.push(continuation);
    } else if (collecting === "context") {
      currentContextLines.push(continuation);
    } else if (currentAnswerLines.length === 0) {
      // Question continuation before answer starts.
      currentQuestion = normalizeCardText(`${currentQuestion} ${continuation}`);
    }
  }

  pushCard(lines.length);

  return {
    headers,
    cards,
    issues,
    rawHeaders,
  };
}

export function serializeMemoNextDeck(input: {
  headers?: MemoNextDeckHeader;
  cards: LifeLabFlashcard[];
}): string {
  const lines: string[] = [];
  const headers = input.headers ?? {};

  if (headers.title) {
    lines.push(`TITLE: ${headers.title}`);
  }

  if (headers.category) {
    lines.push(`CATEGORY: ${headers.category}`);
  }

  if (headers.source) {
    lines.push(`SOURCE: ${headers.source}`);
  }

  lines.push(`CARDS: ${input.cards.length}`);

  if (headers.lifeLabNote) {
    lines.push(`LIFE_LAB_NOTE: ${headers.lifeLabNote}`);
  }

  if (headers.language) {
    lines.push(`LANGUAGE: ${headers.language}`);
  }

  if (headers.tags?.length) {
    lines.push(`TAGS: ${headers.tags.join(", ")}`);
  }

  if (lines.length > 0) {
    lines.push("");
  }

  for (const card of input.cards) {
    if (card.cardType && card.cardType !== "qa") {
      lines.push(`TYPE: ${card.cardType}`);
    }

    if (card.term) {
      lines.push(`TERM: ${card.term}`);
    }

    lines.push(`Q: ${card.question}`);
    lines.push(`A: ${card.answer}`);

    if (card.example) {
      lines.push(`Example: ${card.example}`);
    }

    if (card.context) {
      lines.push(`Context: ${card.context}`);
    }

    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function detectDeckLanguage(
  cards: Array<Pick<LifeLabFlashcard, "question" | "answer" | "example">>,
): "english" | "persian" | "mixed" {
  let persian = 0;
  let latin = 0;
  const persianRe = /[\u0600-\u06FF]/g;
  const latinRe = /[A-Za-z]/g;

  for (const card of cards) {
    const text = `${card.question}\n${card.answer}\n${card.example ?? ""}`;
    persian += (text.match(persianRe) ?? []).length;
    latin += (text.match(latinRe) ?? []).length;
  }

  if (persian > 0 && latin > 0) {
    return "mixed";
  }

  if (persian > 0) {
    return "persian";
  }

  return "english";
}
