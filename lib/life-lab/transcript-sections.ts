export const FULL_TRANSCRIPT_SECTION_TITLES = [
  "Full transcript",
  "Full Transcript",
  "Transcript",
] as const;

const FULL_TRANSCRIPT_TITLES = new Set(
  FULL_TRANSCRIPT_SECTION_TITLES.map((title) => title.trim().toLowerCase()),
);

const TRANSCRIPT_METADATA_LINE_PATTERNS = [
  /^transcript available\s*:/i,
  /^full transcript omitted/i,
  /^captions?\s+(used|source|available)/i,
  /^english captions/i,
  /^this note uses (the )?youtube/i,
  /^description\s*(and|\/|\s+)?chapter list/i,
  /^chapter list/i,
  /^transcript source/i,
  /^source details/i,
  /^availability\s*:/i,
  /^transcript status/i,
  /^no transcript/i,
  /^transcript not included/i,
] as const;

function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

function stripListMarker(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, "");
}

function isTranscriptMetadataLine(line: string): boolean {
  const normalized = stripListMarker(line);

  if (!normalized) {
    return true;
  }

  return TRANSCRIPT_METADATA_LINE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function isFullTranscriptSectionTitle(title: string): boolean {
  return FULL_TRANSCRIPT_TITLES.has(normalizeSectionTitle(title));
}

export function isTranscriptMetadataOnly(sectionText: string): boolean {
  const trimmed = sectionText.trim();

  if (!trimmed) {
    return true;
  }

  const lines = trimmed
    .split("\n")
    .map(stripListMarker)
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return true;
  }

  const substantiveLines = lines.filter((line) => !isTranscriptMetadataLine(line));

  if (substantiveLines.length === 0) {
    return true;
  }

  const hasTimestamps = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(trimmed);
  const hasLongSpokenLine = substantiveLines.some((line) => line.length >= 120);
  const paragraphCount = trimmed
    .split(/\n\s*\n/)
    .map((part) =>
      part
        .split("\n")
        .map(stripListMarker)
        .filter((line) => line.length > 0 && !isTranscriptMetadataLine(line)),
    )
    .filter((paragraphLines) => paragraphLines.length > 0).length;

  if (hasTimestamps && substantiveLines.length >= 2) {
    return false;
  }

  if (hasLongSpokenLine) {
    return false;
  }

  if (paragraphCount >= 2 && substantiveLines.length >= 3) {
    return false;
  }

  if (substantiveLines.length >= 4) {
    return false;
  }

  return substantiveLines.every((line) => line.length <= 96);
}
