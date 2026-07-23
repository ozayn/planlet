import type { FlashcardDeckSummary } from "@/lib/life-lab/flashcard-decks";
import { buildFlashcardDeckItemKey } from "@/lib/life-lab/item-key";

/**
 * Canonical flashcard library totals for Life Lab home, Flashcards section,
 * and Study-all entry points. Prefer this over ad-hoc note/deck counters.
 */
export type LifeLabFlashcardSummary = {
  /** Valid active decks (alias of activeDeckCount). */
  deckCount: number;
  /** Studyable cards across active decks. */
  cardCount: number;
  activeDeckCount: number;
  archivedDeckCount: number;
  embeddedDeckCount: number;
  standaloneDeckCount: number;
  /** Diagnostics — empty/malformed/unavailable; not shown in normal UI. */
  emptyDeckCount: number;
  malformedDeckCount: number;
  referenceUnavailableCount: number;
};

export const EMPTY_LIFE_LAB_FLASHCARD_SUMMARY: LifeLabFlashcardSummary = {
  deckCount: 0,
  cardCount: 0,
  activeDeckCount: 0,
  archivedDeckCount: 0,
  embeddedDeckCount: 0,
  standaloneDeckCount: 0,
  emptyDeckCount: 0,
  malformedDeckCount: 0,
  referenceUnavailableCount: 0,
};

function isArchivedDeck(
  deck: FlashcardDeckSummary,
  archivedKeys: ReadonlySet<string>,
): boolean {
  return archivedKeys.has(buildFlashcardDeckItemKey(deck.slug));
}

/** Active = not archived, has studyable cards, not an unavailable reference stub. */
export function isStudyableFlashcardDeck(
  deck: FlashcardDeckSummary,
  archivedKeys: ReadonlySet<string> = new Set(),
): boolean {
  if (isArchivedDeck(deck, archivedKeys)) {
    return false;
  }

  if (deck.cardCount <= 0) {
    return false;
  }

  if (deck.origin === "reference" && deck.cards.length === 0) {
    return false;
  }

  return true;
}

export function summarizeFlashcardDecks(
  decks: FlashcardDeckSummary[],
  archivedKeys: ReadonlySet<string> = new Set(),
): LifeLabFlashcardSummary {
  let cardCount = 0;
  let activeDeckCount = 0;
  let archivedDeckCount = 0;
  let embeddedDeckCount = 0;
  let standaloneDeckCount = 0;
  let emptyDeckCount = 0;
  let malformedDeckCount = 0;
  let referenceUnavailableCount = 0;

  for (const deck of decks) {
    if (isArchivedDeck(deck, archivedKeys)) {
      archivedDeckCount += 1;
      continue;
    }

    if (deck.origin === "reference" && deck.cardCount <= 0) {
      referenceUnavailableCount += 1;
      continue;
    }

    if (deck.cardCount <= 0) {
      if (deck.parseIssues.length > 0) {
        malformedDeckCount += 1;
      } else {
        emptyDeckCount += 1;
      }
      continue;
    }

    activeDeckCount += 1;
    cardCount += deck.cardCount;

    if (deck.origin === "embedded") {
      embeddedDeckCount += 1;
    } else if (deck.origin === "dedicated") {
      standaloneDeckCount += 1;
    }
  }

  return {
    deckCount: activeDeckCount,
    cardCount,
    activeDeckCount,
    archivedDeckCount,
    embeddedDeckCount,
    standaloneDeckCount,
    emptyDeckCount,
    malformedDeckCount,
    referenceUnavailableCount,
  };
}

export function formatFlashcardSectionMeta(
  summary: LifeLabFlashcardSummary,
): string {
  if (summary.activeDeckCount <= 0) {
    return "No items yet";
  }

  const decks =
    summary.activeDeckCount === 1
      ? "1 deck"
      : `${summary.activeDeckCount} decks`;
  const cards =
    summary.cardCount === 1 ? "1 card" : `${summary.cardCount} cards`;

  return `${decks} · ${cards}`;
}
