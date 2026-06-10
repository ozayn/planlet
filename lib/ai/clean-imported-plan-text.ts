import { resolveDateHint, type DateHintConfidence } from "@/lib/ai/date-hints";

export type CleanImportedPlanTextResult = {
  cleanedText: string;
  removedHeaderLines: string[];
  possibleTitle?: string;
};

const MAX_HEADER_LINE_LENGTH = 60;
const MAX_HEADER_SCAN_LINES = 3;

const TASK_MARKER_PATTERN =
  /^(\s*[-–—•*☐✅✓□▢☑]|\s*\d+[\.\):]|\s*[\(\[]\s*[x✓]?\s*[\)\]])/iu;

const PERSIAN_WEEKDAY_WORDS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "سه شنبه",
  "چهارشنبه",
  "چهار شنبه",
  "پنجشنبه",
  "پنج شنبه",
  "جمعه",
];

const PERSIAN_DATE_WORDS = [
  ...PERSIAN_WEEKDAY_WORDS,
  "امروز",
  "فردا",
  "پس‌فردا",
  "پس فردا",
  "هفته",
  "این هفته",
  "ماه",
  "سال",
];

const ENGLISH_WEEKDAY_WORDS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const ENGLISH_DATE_WORDS = [
  ...ENGLISH_WEEKDAY_WORDS,
  "today",
  "tomorrow",
  "week",
  "month",
  "year",
];

const ACTION_VERB_PATTERNS = [
  /\b(call|buy|send|email|meet|schedule|book|pick up|go to|therapy|groceries)\b/i,
  /(تماس|خرید|رفتن|اضافه کردن|تصمیم|کار|وقت|فیلم|ماشین)/u,
];

const ENGLISH_HEADER_PATTERNS = [
  /\btoday['’]s plan\b/i,
  /\btomorrow['’]s plan\b/i,
  /\bthis week['’]s plan\b/i,
  /\bweekly plan\b/i,
  /\bmonthly plan\b/i,
  /\byearly plan\b/i,
  /\bplan for\b/i,
  /\bto-?do list for\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+plan\b/i,
  /\b\d{4}\s+plan\b/i,
  new RegExp(
    `\\b(${ENGLISH_WEEKDAY_WORDS.join("|")})\\s+plan\\b`,
    "i",
  ),
];

function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

function hasTaskMarker(line: string): boolean {
  return TASK_MARKER_PATTERN.test(line.trim());
}

function containsPersianDateWord(line: string): boolean {
  const normalized = line.replace(/\u200c/g, "");
  return PERSIAN_DATE_WORDS.some((word) => normalized.includes(word));
}

function containsEnglishDateWord(line: string): boolean {
  const lower = line.toLowerCase();
  return ENGLISH_DATE_WORDS.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    return pattern.test(lower);
  });
}

function looksLikeActionTask(line: string): boolean {
  return ACTION_VERB_PATTERNS.some((pattern) => pattern.test(line));
}

function matchesEnglishHeaderPattern(line: string): boolean {
  return ENGLISH_HEADER_PATTERNS.some((pattern) => pattern.test(line));
}

function isLikelyHeaderLine(line: string): boolean {
  const trimmed = normalizeLine(line);

  if (!trimmed || trimmed.length > MAX_HEADER_LINE_LENGTH) {
    return false;
  }

  if (hasTaskMarker(trimmed)) {
    return false;
  }

  if (looksLikeActionTask(trimmed)) {
    return false;
  }

  const persianNormalized = trimmed.replace(/\u200c/g, "");

  if (persianNormalized.includes("برنامه") && containsPersianDateWord(trimmed)) {
    return true;
  }

  if (
    persianNormalized.includes("لیست کارهای") &&
    containsPersianDateWord(trimmed)
  ) {
    return true;
  }

  if (/^کارهای\s/u.test(persianNormalized) && containsPersianDateWord(trimmed)) {
    return true;
  }

  if (/\bplan\b/i.test(trimmed) && containsEnglishDateWord(trimmed)) {
    return true;
  }

  if (matchesEnglishHeaderPattern(trimmed)) {
    return true;
  }

  return false;
}

function trimEmptyEdges(lines: string[]): string[] {
  const result = [...lines];

  while (result.length > 0 && result[0].trim() === "") {
    result.shift();
  }

  while (result.length > 0 && result[result.length - 1].trim() === "") {
    result.pop();
  }

  return result;
}

export function cleanImportedPlanText(input: string): CleanImportedPlanTextResult {
  const lines = input.split(/\r?\n/);
  const removedHeaderLines: string[] = [];
  const keptLines: string[] = [];
  let nonEmptySeen = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      keptLines.push("");
      continue;
    }

    if (nonEmptySeen < MAX_HEADER_SCAN_LINES && isLikelyHeaderLine(trimmed)) {
      removedHeaderLines.push(trimmed);
      nonEmptySeen += 1;
      continue;
    }

    keptLines.push(line);
    nonEmptySeen += 1;
  }

  const cleanedText = trimEmptyEdges(keptLines).join("\n").trim();

  return {
    cleanedText,
    removedHeaderLines,
    possibleTitle: removedHeaderLines[0],
  };
}

export type HeaderDateHint = {
  dateString: string;
  rawText: string;
  confidence: DateHintConfidence;
  explanation?: string;
};

function lowerConfidence(
  current: DateHintConfidence,
  next: DateHintConfidence,
): DateHintConfidence {
  const order: Record<DateHintConfidence, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
  };

  return order[current] <= order[next] ? current : next;
}

export function dateHintFromRemovedHeaders(
  removedHeaderLines: string[],
  existing?: HeaderDateHint | null,
): HeaderDateHint | null {
  let bestHeaderHint: HeaderDateHint | null = null;

  for (const line of removedHeaderLines) {
    const resolved = resolveDateHint(line);

    if (!resolved.dateString) {
      continue;
    }

    const hint: HeaderDateHint = {
      dateString: resolved.dateString,
      rawText: line,
      confidence:
        resolved.confidence === "HIGH" ? "MEDIUM" : resolved.confidence,
      explanation: resolved.explanation,
    };

    if (
      !bestHeaderHint ||
      (hint.confidence === "HIGH" && bestHeaderHint.confidence !== "HIGH") ||
      (hint.confidence === "MEDIUM" && bestHeaderHint.confidence === "LOW")
    ) {
      bestHeaderHint = hint;
    }
  }

  if (!existing?.dateString) {
    return bestHeaderHint;
  }

  if (!bestHeaderHint) {
    return existing;
  }

  if (existing.dateString === bestHeaderHint.dateString) {
    return {
      ...existing,
      confidence: lowerConfidence(existing.confidence, "HIGH"),
      explanation: existing.explanation ?? bestHeaderHint.explanation,
    };
  }

  return existing;
}

type CleanImportExample = {
  name: string;
  input: string;
  expectedCleanedText: string;
  expectedRemovedHeaders: string[];
};

export const CLEAN_IMPORTED_PLAN_TEXT_EXAMPLES: CleanImportExample[] = [
  {
    name: "Persian Monday plan header",
    input: `برنامه دوشنبه
- وقت ارتوپد
- وقت فیزیکال تراپی`,
    expectedCleanedText: `- وقت ارتوپد
- وقت فیزیکال تراپی`,
    expectedRemovedHeaders: ["برنامه دوشنبه"],
  },
  {
    name: "English today plan header",
    input: `Today's plan
- therapy
- museum`,
    expectedCleanedText: `- therapy
- museum`,
    expectedRemovedHeaders: ["Today's plan"],
  },
  {
    name: "English plan for Monday with numbered tasks",
    input: `Plan for Monday
1. call doctor
2. groceries`,
    expectedCleanedText: `1. call doctor
2. groceries`,
    expectedRemovedHeaders: ["Plan for Monday"],
  },
  {
    name: "Marked task with برنامه should stay",
    input: "- برنامه ریزی برای سفر",
    expectedCleanedText: "- برنامه ریزی برای سفر",
    expectedRemovedHeaders: [],
  },
  {
    name: "Persian Monday plan screenshot OCR",
    input: `برنامه دوشنبه
- وقت ارتوپد
- وقت فیزیکال تراپی
- ماشین ظرف‌شویی
- تصمیم برای کجا کار کردن و خروج از خانه
- کار آرش
- اضافه کردن ایونت
- فیلم کوتاه`,
    expectedCleanedText: `- وقت ارتوپد
- وقت فیزیکال تراپی
- ماشین ظرف‌شویی
- تصمیم برای کجا کار کردن و خروج از خانه
- کار آرش
- اضافه کردن ایونت
- فیلم کوتاه`,
    expectedRemovedHeaders: ["برنامه دوشنبه"],
  },
];

export function verifyCleanImportedPlanTextExamples(): void {
  for (const example of CLEAN_IMPORTED_PLAN_TEXT_EXAMPLES) {
    const result = cleanImportedPlanText(example.input);

    if (result.cleanedText !== example.expectedCleanedText) {
      throw new Error(
        `${example.name}: expected cleanedText ${JSON.stringify(example.expectedCleanedText)}, got ${JSON.stringify(result.cleanedText)}`,
      );
    }

    if (
      JSON.stringify(result.removedHeaderLines) !==
      JSON.stringify(example.expectedRemovedHeaders)
    ) {
      throw new Error(
        `${example.name}: expected removed headers ${JSON.stringify(example.expectedRemovedHeaders)}, got ${JSON.stringify(result.removedHeaderLines)}`,
      );
    }
  }
}
