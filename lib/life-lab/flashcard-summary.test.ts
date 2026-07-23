import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { FlashcardDeckSummary } from "@/lib/life-lab/flashcard-decks";
import { buildFlashcardDeckItemKey } from "@/lib/life-lab/item-key";
import {
  formatFlashcardSectionMeta,
  isStudyableFlashcardDeck,
  summarizeFlashcardDecks,
} from "@/lib/life-lab/flashcard-summary";

function sampleDeck(
  overrides: Partial<FlashcardDeckSummary> = {},
): FlashcardDeckSummary {
  return {
    id: "deck-a",
    slug: "deck-a",
    title: "Deck A",
    sourceKind: "other",
    category: null,
    sourceLabel: null,
    language: "english",
    cardCount: 3,
    modifiedAt: "2026-07-23T12:00:00.000Z",
    modifiedAtLabel: "Jul 23, 2026",
    sourceNoteHref: null,
    sourceNoteTitle: null,
    sourceSectionId: "flashcards",
    tags: [],
    searchText: "deck a",
    parseIssues: [],
    cards: [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
      { question: "Q3", answer: "A3" },
    ],
    origin: "dedicated",
    ...overrides,
  };
}

describe("canonical flashcard summary", () => {
  it("counts valid decks and studyable cards", () => {
    const summary = summarizeFlashcardDecks([
      sampleDeck({ slug: "a", id: "a", cardCount: 10 }),
      sampleDeck({
        slug: "b",
        id: "b",
        cardCount: 4,
        origin: "embedded",
        sourceSectionId: "youtube-learning",
      }),
    ]);

    assert.equal(summary.deckCount, 2);
    assert.equal(summary.activeDeckCount, 2);
    assert.equal(summary.cardCount, 14);
    assert.equal(summary.standaloneDeckCount, 1);
    assert.equal(summary.embeddedDeckCount, 1);
    assert.equal(summary.archivedDeckCount, 0);
  });

  it("excludes archived decks from active and card totals", () => {
    const archived = sampleDeck({ slug: "archived-deck", id: "archived-deck", cardCount: 8 });
    const active = sampleDeck({ slug: "active", id: "active", cardCount: 2 });
    const archivedKeys = new Set([buildFlashcardDeckItemKey(archived.slug)]);

    const summary = summarizeFlashcardDecks([archived, active], archivedKeys);

    assert.equal(summary.archivedDeckCount, 1);
    assert.equal(summary.activeDeckCount, 1);
    assert.equal(summary.cardCount, 2);
    assert.equal(isStudyableFlashcardDeck(archived, archivedKeys), false);
    assert.equal(isStudyableFlashcardDeck(active, archivedKeys), true);
  });

  it("excludes empty decks from Study all card count", () => {
    const summary = summarizeFlashcardDecks([
      sampleDeck({ slug: "full", id: "full", cardCount: 5 }),
      sampleDeck({
        slug: "empty",
        id: "empty",
        cardCount: 0,
        cards: [],
      }),
    ]);

    assert.equal(summary.activeDeckCount, 1);
    assert.equal(summary.cardCount, 5);
    assert.equal(summary.emptyDeckCount, 1);
  });

  it("excludes malformed empty decks and unavailable references", () => {
    const summary = summarizeFlashcardDecks([
      sampleDeck({ slug: "ok", id: "ok", cardCount: 1 }),
      sampleDeck({
        slug: "bad",
        id: "bad",
        cardCount: 0,
        cards: [],
        parseIssues: [{ line: 1, message: "bad" }],
      }),
      sampleDeck({
        slug: "ref",
        id: "ref",
        cardCount: 0,
        cards: [],
        origin: "reference",
        parseIssues: [{ line: 0, message: "unavailable" }],
      }),
    ]);

    assert.equal(summary.activeDeckCount, 1);
    assert.equal(summary.cardCount, 1);
    assert.equal(summary.malformedDeckCount, 1);
    assert.equal(summary.referenceUnavailableCount, 1);
  });

  it("formats section meta and empty state", () => {
    assert.equal(
      formatFlashcardSectionMeta({
        deckCount: 5,
        cardCount: 84,
        activeDeckCount: 5,
        archivedDeckCount: 0,
        embeddedDeckCount: 2,
        standaloneDeckCount: 3,
        emptyDeckCount: 0,
        malformedDeckCount: 0,
        referenceUnavailableCount: 0,
      }),
      "5 decks · 84 cards",
    );
    assert.equal(
      formatFlashcardSectionMeta({
        deckCount: 1,
        cardCount: 1,
        activeDeckCount: 1,
        archivedDeckCount: 0,
        embeddedDeckCount: 0,
        standaloneDeckCount: 1,
        emptyDeckCount: 0,
        malformedDeckCount: 0,
        referenceUnavailableCount: 0,
      }),
      "1 deck · 1 card",
    );
    assert.equal(
      formatFlashcardSectionMeta({
        deckCount: 0,
        cardCount: 0,
        activeDeckCount: 0,
        archivedDeckCount: 0,
        embeddedDeckCount: 0,
        standaloneDeckCount: 0,
        emptyDeckCount: 0,
        malformedDeckCount: 0,
        referenceUnavailableCount: 0,
      }),
      "No items yet",
    );
  });
});
