import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";

export const CARD_PREVIEW_MAX_LENGTH = 120;

const NOISY_PREVIEW_PATTERNS = [
  /https?:\/\//i,
  /\bURL\s*:/i,
  /\bChannel\s*:/i,
  /\bLength\s*:/i,
  /\bTranscript\s*:/i,
  /\bPlaylist URL\s*:/i,
  /\bSource\s*:/i,
  /\bIMDb ID\s*:/i,
  /[^\s]+\.csv\b/i,
  /imdb\/raw/i,
  /[^\s]+\.md\b/i,
  /\|.+\|/,
  /^#{1,6}\s/m,
];

export function isNoisyCardPreview(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  return NOISY_PREVIEW_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function buildCardPreview(
  excerpt: string | undefined,
  maxLength = CARD_PREVIEW_MAX_LENGTH,
): string | null {
  const trimmed = excerpt?.trim();

  if (!trimmed || isNoisyCardPreview(trimmed)) {
    return null;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function extractSearchSnippet(
  searchText: string | undefined,
  query: string,
  maxLength = CARD_PREVIEW_MAX_LENGTH,
): string | null {
  const normalizedSearch = searchText?.trim();
  const normalizedQuery = query.trim();

  if (!normalizedSearch || !normalizedQuery) {
    return null;
  }

  const lowerSearch = normalizedSearch.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const index = lowerSearch.indexOf(lowerQuery);

  if (index === -1) {
    return null;
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(
    normalizedSearch.length,
    index + normalizedQuery.length + 60,
  );
  let snippet = normalizedSearch.slice(start, end).replace(/\s+/g, " ").trim();

  if (start > 0) {
    snippet = `…${snippet}`;
  }

  if (end < normalizedSearch.length) {
    snippet = `${snippet}…`;
  }

  return buildCardPreview(snippet, maxLength);
}

export function selectCardPreview(
  note: Pick<LifeLabNoteSummary, "excerpt" | "searchText">,
  options: { searchQuery?: string } = {},
): string | null {
  const searchQuery = options.searchQuery?.trim();

  if (searchQuery) {
    const snippet = extractSearchSnippet(note.searchText, searchQuery);

    if (snippet) {
      return snippet;
    }
  }

  return buildCardPreview(note.excerpt);
}
