/**
 * Shared Markdown → spoken-text pipeline for Device Voice and OpenAI narration.
 * Convert structure into natural sentences; never speak Markdown syntax markers.
 */

const MERMAID_BLOCK_PATTERN = /```mermaid[\s\S]*?```/gi;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const FLASHCARD_SECTION_PATTERN =
  /^#{1,6}\s+(?:Optional Flashcards|Flashcards|Study Cards)\s*[\r\n]+[\s\S]*$/gim;
const MARKDOWN_LINK_PATTERN = /!?\[([^\]]*)]\([^)]*\)/g;
const ANGLE_BRACKET_URL_PATTERN = /<https?:\/\/[^>]+>/gi;
const BARE_HTTPS_URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;
const BARE_WWW_URL_PATTERN = /\bwww\.[^\s<>"')\]]+/gi;

const BULLET_MARKER_PATTERN =
  /^\s*(?:[-*+•●○◦▪▫]|–|—)\s+(.*)$/;
const NUMBERED_LIST_PATTERN = /^\s*(\d+)[.)]\s+(.*)$/;
const LETTERED_LIST_PATTERN = /^\s*[a-z][.)]\s+(.*)$/i;
const BLOCKQUOTE_PREFIX_PATTERN = /^\s{0,3}>\s?/;
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const HORIZONTAL_RULE_PATTERN =
  /^\s*(?:-{3,}|\*{3,}|_{3,}|\u2013{3,}|\u2014{3,})\s*$/;
const TABLE_ROW_PATTERN = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_PATTERN =
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

/** Labels whose numbering is preserved inside item text (Step 1, Lesson 2, …). */
const MEANINGFUL_NUMBER_LABEL_PATTERN =
  /^(?:step|lesson|principle|article|chapter|part|rule|phase|stage|section|unit|day|week|module|exercise|question)\s+\d+\b/i;

export function preservesMeaningfulListNumbering(itemText: string): boolean {
  return MEANINGFUL_NUMBER_LABEL_PATTERN.test(itemText.trim());
}

export function stripBareUrlsFromSpeechText(text: string): string {
  return text
    .replace(BARE_HTTPS_URL_PATTERN, "")
    .replace(BARE_WWW_URL_PATTERN, "");
}

export function isUrlOnlySpeechLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (/^source\s*:\s*$/i.test(trimmed)) {
    return true;
  }

  const withoutLabel = trimmed.replace(/^source\s*:\s*/i, "").trim();

  return /^(https?:\/\/\S+|www\.\S+)$/i.test(withoutLabel || trimmed);
}

function cleanupSpeechSpacing(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function ensureSentence(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  if (/[.!?…]["')\]]*$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function stripInlineMarkdown(text: string): string {
  let cleaned = text;

  cleaned = cleaned.replace(MARKDOWN_LINK_PATTERN, "$1");
  cleaned = cleaned.replace(ANGLE_BRACKET_URL_PATTERN, " ");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1");
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");
  cleaned = stripBareUrlsFromSpeechText(cleaned);

  return cleaned;
}

function stripResidualMarkdownSyntax(text: string): string {
  return text
    .replace(/(^|[\s(])[#>*_~|]+(?=[\s)]|$)/g, "$1")
    .replace(/[#>*_~|]/g, " ")
    .replace(/(^|[\s(])[-*+]{1,3}(?=\s|$)/g, "$1");
}

function sanitizeInline(text: string): string {
  return cleanupSpeechSpacing(
    stripResidualMarkdownSyntax(stripInlineMarkdown(text)),
  );
}

function looksLikeEmptySpeech(text: string): boolean {
  return !text.trim() || /^[-*+#>\s.|]+$/.test(text.trim());
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => sanitizeInline(cell))
    .filter((cell) => !looksLikeEmptySpeech(cell));
}

function convertTableRows(rows: string[]): string {
  if (rows.length === 0) {
    return "";
  }

  const parsed = rows
    .filter((row) => !TABLE_SEPARATOR_PATTERN.test(row))
    .map(parseTableCells)
    .filter((cells) => cells.length > 0);

  if (parsed.length === 0) {
    return "";
  }

  const headers = parsed[0];
  const bodyRows = parsed.slice(1);

  if (bodyRows.length === 0) {
    return ensureSentence(headers.join(", "));
  }

  const spokenRows = bodyRows.map((cells) => {
    if (headers.length > 0 && cells.length === headers.length) {
      return ensureSentence(
        headers
          .map((header, index) => `${header}: ${cells[index] ?? ""}`.trim())
          .join(". "),
      );
    }

    return ensureSentence(cells.join(", "));
  });

  return spokenRows.join(" ");
}

function stripBlockquotePrefixes(line: string): string {
  let current = line;

  while (BLOCKQUOTE_PREFIX_PATTERN.test(current)) {
    current = current.replace(BLOCKQUOTE_PREFIX_PATTERN, "");
  }

  return current;
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return TABLE_ROW_PATTERN.test(trimmed) || TABLE_SEPARATOR_PATTERN.test(trimmed);
}

type LineKind =
  | "empty"
  | "skip"
  | "heading"
  | "bullet"
  | "numbered"
  | "lettered"
  | "quote"
  | "table"
  | "paragraph";

function classifyLine(line: string): {
  kind: LineKind;
  text: string;
} {
  const trimmed = line.trim();

  if (!trimmed) {
    return { kind: "empty", text: "" };
  }

  if (HORIZONTAL_RULE_PATTERN.test(trimmed) || isUrlOnlySpeechLine(trimmed)) {
    return { kind: "skip", text: "" };
  }

  if (isTableLine(trimmed)) {
    return { kind: "table", text: trimmed };
  }

  const headingMatch = trimmed.match(HEADING_PATTERN);

  if (headingMatch?.[2]) {
    return { kind: "heading", text: headingMatch[2] };
  }

  const withoutQuote = stripBlockquotePrefixes(trimmed);
  const isQuote = withoutQuote !== trimmed;
  const contentLine = withoutQuote.trim();

  if (!contentLine) {
    return { kind: "skip", text: "" };
  }

  if (BULLET_MARKER_PATTERN.test(contentLine)) {
    const match = contentLine.match(BULLET_MARKER_PATTERN);
    return { kind: "bullet", text: match?.[1] ?? "" };
  }

  if (NUMBERED_LIST_PATTERN.test(contentLine)) {
    const match = contentLine.match(NUMBERED_LIST_PATTERN);
    return { kind: "numbered", text: match?.[2] ?? "" };
  }

  if (LETTERED_LIST_PATTERN.test(contentLine)) {
    const match = contentLine.match(LETTERED_LIST_PATTERN);
    return { kind: "lettered", text: match?.[1] ?? "" };
  }

  if (isQuote) {
    return { kind: "quote", text: contentLine };
  }

  return { kind: "paragraph", text: contentLine };
}

function convertMarkdownLines(text: string): string {
  const lines = text.split("\n");
  const spoken: string[] = [];
  let index = 0;
  let paragraphBuffer: string[] = [];

  function flushParagraph(): void {
    if (paragraphBuffer.length === 0) {
      return;
    }

    const paragraph = sanitizeInline(paragraphBuffer.join(" "));
    paragraphBuffer = [];

    if (paragraph) {
      spoken.push(ensureSentence(paragraph));
    }
  }

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const classified = classifyLine(line);

    if (classified.kind === "table") {
      flushParagraph();
      const tableLines: string[] = [];

      while (index < lines.length && isTableLine(lines[index] ?? "")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }

      const tableSpeech = convertTableRows(tableLines);

      if (tableSpeech) {
        spoken.push(tableSpeech);
      }

      continue;
    }

    if (classified.kind === "empty" || classified.kind === "skip") {
      flushParagraph();
      index += 1;
      continue;
    }

    if (classified.kind === "paragraph") {
      paragraphBuffer.push(classified.text);
      index += 1;
      continue;
    }

    flushParagraph();

    const item = sanitizeInline(classified.text);

    if (item && !looksLikeEmptySpeech(item)) {
      // Headings, quotes, and list items become their own spoken sentences
      // so TTS gets a natural pause between bullets.
      spoken.push(ensureSentence(item));
    }

    index += 1;
  }

  flushParagraph();

  return cleanupSpeechSpacing(spoken.join(" "));
}

/**
 * Convert Markdown into natural spoken prose for TTS.
 * Used by Device Voice and OpenAI narration alike.
 */
export function markdownToSpeechText(content: string): string {
  let text = content.replace(/\r\n/g, "\n");

  if (!text.trim()) {
    return "";
  }

  text = text.replace(MERMAID_BLOCK_PATTERN, "\n");
  text = text.replace(CODE_BLOCK_PATTERN, "\n");
  text = text.replace(FLASHCARD_SECTION_PATTERN, "\n");

  return convertMarkdownLines(text);
}

/**
 * Light cleanup for already-prose strings (titles, assembled speech).
 * Does not force sentence endings — use markdownToSpeechText for Markdown bodies.
 */
export function sanitizeSpeechText(text: string): string {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isUrlOnlySpeechLine(line))
    .map((line) => {
      let cleanedLine = stripBareUrlsFromSpeechText(line);

      if (/^source\s*:/i.test(cleanedLine.trim())) {
        const remainder = cleanedLine.replace(/^source\s*:\s*/i, "").trim();
        return remainder ? cleanedLine : "";
      }

      return cleanedLine;
    })
    .map((line) => sanitizeInline(line))
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !looksLikeEmptySpeech(line));

  return cleanupSpeechSpacing(cleaned.join(" "));
}

export function plainTextToSpeechText(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  // Plain text may still include Markdown fragments (flashcards, paste).
  if (/^#{1,6}\s|^\s*[-*+•]\s|\|[^\n]+\|/.test(trimmed) || trimmed.includes("\n")) {
    return markdownToSpeechText(trimmed);
  }

  return sanitizeSpeechText(trimmed);
}
