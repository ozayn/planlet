import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import { getLifeLabSectionLabel } from "@/lib/life-lab/sections";

const DATE_SUFFIX_PATTERN = /\s*[–—-]\s*\d{4}-\d{2}-\d{2}\s*$/;
const BBC_WORLD_SERVICE_PATTERN = /\bBBC World Service\b/gi;

export type FlashcardDeckHeaderModel = {
  fullTitle: string;
  /** Desktop-friendly title (date may remain). */
  displayTitle: string;
  /** Compact one-line title for narrow headers. */
  shortTitle: string;
  /** Optional “From …” line that adds new information. */
  sourceLine: string | null;
  /** Whether More should offer Open source note. */
  showOpenSourceNote: boolean;
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

export function shortenFlashcardDeckTitle(
  title: string,
  maxLength = 28,
): {
  fullTitle: string;
  displayTitle: string;
  shortTitle: string;
} {
  const fullTitle = title.trim();
  const withoutDate = fullTitle.replace(DATE_SUFFIX_PATTERN, "").trim() || fullTitle;
  const bbcCompact = withoutDate.replace(BBC_WORLD_SERVICE_PATTERN, "BBC").trim();
  const displayTitle = withoutDate;

  if (bbcCompact.length <= maxLength) {
    return { fullTitle, displayTitle, shortTitle: bbcCompact };
  }

  const truncated = `${bbcCompact.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
  return { fullTitle, displayTitle, shortTitle: truncated };
}

/**
 * Central rules for deck-detail header deduplication.
 * Hide generic route titles at the page layer; this model avoids repeating
 * identical deck/source titles and collapses redundant metadata.
 */
export function resolveFlashcardDeckHeader(input: {
  title: string;
  sourceNoteTitle?: string | null;
  sourceNoteHref?: string | null;
  sourceSectionId?: LifeLabSectionId | null;
  category?: string | null;
}): FlashcardDeckHeaderModel {
  const titles = shortenFlashcardDeckTitle(input.title);
  const sectionLabel = input.sourceSectionId
    ? getLifeLabSectionLabel(input.sourceSectionId)
    : null;
  const sourceTitle = input.sourceNoteTitle?.trim() || null;
  const sourceMatchesDeck = titlesAreEquivalent(sourceTitle, input.title);
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

  if (
    sourceLine &&
    category &&
    !categoryMatchesSection &&
    sectionLabel &&
    !titlesAreEquivalent(category, sectionLabel)
  ) {
    // Keep section-only line; category stays available via deck metadata elsewhere.
  }

  return {
    ...titles,
    sourceLine,
    showOpenSourceNote: Boolean(input.sourceNoteHref),
  };
}
