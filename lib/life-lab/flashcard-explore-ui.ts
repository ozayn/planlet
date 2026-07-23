import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  flashcardDeckLanguageLabel,
  flashcardSourceKindCardLabel,
  type FlashcardDeckLanguage,
  type FlashcardDeckSourceKind,
  type FlashcardDeckSummary,
} from "@/lib/life-lab/flashcard-decks";
import { getLifeLabSectionLabel } from "@/lib/life-lab/sections";

const DATE_SUFFIX_PATTERN = /\s*[–—-]\s*\d{4}-\d{2}-\d{2}\s*$/;
const DATE_CAPTURE_PATTERN = /(\d{4}-\d{2}-\d{2})\s*$/;
const BBC_WORLD_SERVICE_PATTERN = /\bBBC World Service\b/gi;

export type FlashcardDeckHeaderModel = {
  fullTitle: string;
  /** Cleaned title without embedded date (and BBC shortening when applicable). */
  displayTitle: string;
  /** Compact one-line title for narrow headers. */
  shortTitle: string;
  /** Optional “From …” line that adds new information. */
  sourceLine: string | null;
  /** Whether More should offer Open source note. */
  showOpenSourceNote: boolean;
};

export type FlashcardLibraryCardModel = {
  href: string;
  canonicalTitle: string;
  displayTitle: string;
  dateLabel: string | null;
  cardCountLabel: string;
  /** Visible metadata after the date (filter-aware). */
  metaSegments: string[];
  /** Full accessible description for screen readers. */
  ariaLabel: string;
  parseFailed: boolean;
};

function normalizeTitleKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titlesAreEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left?.trim() || !right?.trim()) {
    return false;
  }

  return normalizeTitleKey(left) === normalizeTitleKey(right);
}

export function extractDateSuffixFromTitle(title: string): string | null {
  const match = title.trim().match(DATE_CAPTURE_PATTERN);
  return match?.[1] ?? null;
}

function formatIsoDateLabel(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/**
 * Shared display-title resolver for deck cards and detail headers.
 * Prefer explicit display titles, then safe deterministic cleaning.
 */
export function resolveFlashcardDeckDisplayTitle(input: {
  title: string;
  displayTitle?: string | null;
  sourceNoteDisplayTitle?: string | null;
  maxShortLength?: number;
}): {
  canonicalTitle: string;
  displayTitle: string;
  shortTitle: string;
  dateFromTitle: string | null;
} {
  const canonicalTitle = input.title.trim();
  const dateFromTitle = extractDateSuffixFromTitle(canonicalTitle);
  const explicit =
    input.displayTitle?.trim() ||
    input.sourceNoteDisplayTitle?.trim() ||
    null;

  const withoutDate =
    canonicalTitle.replace(DATE_SUFFIX_PATTERN, "").trim() || canonicalTitle;
  const cleaned = withoutDate.replace(BBC_WORLD_SERVICE_PATTERN, "BBC").trim();
  const displayTitle = explicit || cleaned;
  const maxShortLength = input.maxShortLength ?? 36;

  if (displayTitle.length <= maxShortLength) {
    return {
      canonicalTitle,
      displayTitle,
      shortTitle: displayTitle,
      dateFromTitle,
    };
  }

  return {
    canonicalTitle,
    displayTitle,
    shortTitle: `${displayTitle.slice(0, Math.max(1, maxShortLength - 1)).trimEnd()}…`,
    dateFromTitle,
  };
}

export function shortenFlashcardDeckTitle(
  title: string,
  maxLength = 28,
): {
  fullTitle: string;
  displayTitle: string;
  shortTitle: string;
} {
  const resolved = resolveFlashcardDeckDisplayTitle({
    title,
    maxShortLength: maxLength,
  });

  return {
    fullTitle: resolved.canonicalTitle,
    displayTitle: resolved.displayTitle,
    shortTitle: resolved.shortTitle,
  };
}

/**
 * Central rules for deck-detail header deduplication.
 */
export function resolveFlashcardDeckHeader(input: {
  title: string;
  displayTitle?: string | null;
  sourceNoteTitle?: string | null;
  sourceNoteDisplayTitle?: string | null;
  sourceNoteHref?: string | null;
  sourceSectionId?: LifeLabSectionId | null;
  category?: string | null;
}): FlashcardDeckHeaderModel {
  const titles = resolveFlashcardDeckDisplayTitle({
    title: input.title,
    displayTitle: input.displayTitle,
    sourceNoteDisplayTitle: input.sourceNoteDisplayTitle,
  });
  const sectionLabel = input.sourceSectionId
    ? getLifeLabSectionLabel(input.sourceSectionId)
    : null;
  const sourceTitle = input.sourceNoteTitle?.trim() || null;
  const sourceMatchesDeck =
    titlesAreEquivalent(sourceTitle, input.title) ||
    titlesAreEquivalent(sourceTitle, titles.displayTitle);
  const category = input.category?.trim() || null;
  const categoryMatchesSection =
    category && sectionLabel
      ? titlesAreEquivalent(category, sectionLabel)
      : false;

  let sourceLine: string | null = null;

  if (sectionLabel) {
    sourceLine = `From ${sectionLabel}`;
  } else if (sourceTitle && !sourceMatchesDeck) {
    sourceLine = `From ${sourceTitle}`;
  } else if (category && !categoryMatchesSection) {
    sourceLine = category;
  }

  return {
    fullTitle: titles.canonicalTitle,
    displayTitle: titles.displayTitle,
    shortTitle: titles.shortTitle,
    sourceLine,
    showOpenSourceNote: Boolean(input.sourceNoteHref),
  };
}

const SECTION_CARD_LABELS: Partial<Record<LifeLabSectionId, string>> = {
  "reading-briefs": "Reading Brief",
  "youtube-learning": "YouTube",
  podcasts: "Podcast",
  "lecture-notes": "Lecture",
  "learning-map": "Topic",
  "learning-dictionary": "Dictionary",
};

export function flashcardLibrarySourceLabel(input: {
  sourceKind: FlashcardDeckSourceKind;
  sourceSectionId?: LifeLabSectionId | null;
  category?: string | null;
}): string | null {
  if (input.sourceSectionId && SECTION_CARD_LABELS[input.sourceSectionId]) {
    return SECTION_CARD_LABELS[input.sourceSectionId] ?? null;
  }

  if (input.sourceKind !== "other") {
    return flashcardSourceKindCardLabel(input.sourceKind);
  }

  const category = input.category?.trim();
  if (!category) {
    return null;
  }

  const normalized = category.toLowerCase();
  if (normalized.includes("reading brief")) {
    return "Reading Brief";
  }
  if (normalized.includes("youtube")) {
    return "YouTube";
  }
  if (normalized.includes("podcast")) {
    return "Podcast";
  }

  return category;
}

function sourceLabelMatchesActiveFilter(
  sourceLabel: string | null,
  sourceKind: FlashcardDeckSourceKind,
  activeSource: FlashcardDeckSourceKind | "all",
): boolean {
  if (!sourceLabel || activeSource === "all") {
    return false;
  }

  if (sourceKind === activeSource) {
    const filterCardLabel = flashcardSourceKindCardLabel(activeSource);
    // Only hide when the visible label is the same idea as the active filter.
    if (titlesAreEquivalent(sourceLabel, filterCardLabel)) {
      return true;
    }
    // Plural filter chips (Podcasts) vs singular card labels (Podcast).
    if (
      titlesAreEquivalent(sourceLabel, filterCardLabel.replace(/s$/i, "")) ||
      titlesAreEquivalent(`${sourceLabel}s`, filterCardLabel)
    ) {
      return true;
    }
  }

  return false;
}

export function resolveFlashcardLibraryCardModel(
  deck: FlashcardDeckSummary & { displayTitle?: string | null },
  filters: {
    sourceKind?: FlashcardDeckSourceKind | "all";
    language?: FlashcardDeckLanguage | "all";
  } = {},
): FlashcardLibraryCardModel {
  const titles = resolveFlashcardDeckDisplayTitle({
    title: deck.title,
    displayTitle: deck.displayTitle,
  });
  const parseFailed = deck.cardCount === 0 && deck.parseIssues.length > 0;
  const dateLabel =
    deck.modifiedAtLabel ||
    (titles.dateFromTitle
      ? formatIsoDateLabel(titles.dateFromTitle)
      : null);
  const cardCountLabel = parseFailed
    ? "Unavailable"
    : `${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}`;
  const languageLabel = flashcardDeckLanguageLabel(deck.language);
  const sourceLabel = flashcardLibrarySourceLabel({
    sourceKind: deck.sourceKind,
    sourceSectionId: deck.sourceSectionId,
    category: deck.category,
  });

  const activeSource = filters.sourceKind ?? "all";
  const activeLanguage = filters.language ?? "all";

  const visibleLanguage =
    activeLanguage === "all" ? languageLabel : null;
  const visibleSource = sourceLabelMatchesActiveFilter(
    sourceLabel,
    deck.sourceKind,
    activeSource,
  )
    ? null
    : sourceLabel;

  const metaSegments = [visibleLanguage, visibleSource].filter(
    (value): value is string => Boolean(value),
  );

  const ariaParts = [
    titles.canonicalTitle,
    dateLabel,
    cardCountLabel,
    languageLabel,
    sourceLabel,
  ].filter(Boolean);

  return {
    href: `/life-lab/flashcards/${deck.slug}`,
    canonicalTitle: titles.canonicalTitle,
    displayTitle: titles.displayTitle,
    dateLabel,
    cardCountLabel,
    metaSegments,
    ariaLabel: ariaParts.join(" · "),
    parseFailed,
  };
}
