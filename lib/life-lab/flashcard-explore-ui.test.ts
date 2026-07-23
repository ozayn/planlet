import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { FlashcardDeckSummary } from "@/lib/life-lab/flashcard-decks";
import {
  flashcardLibrarySourceLabel,
  resolveFlashcardDeckDisplayTitle,
  resolveFlashcardDeckHeader,
  resolveFlashcardLibraryCardModel,
  shortenFlashcardDeckTitle,
  titlesAreEquivalent,
} from "@/lib/life-lab/flashcard-explore-ui";

function sampleDeck(
  overrides: Partial<FlashcardDeckSummary> = {},
): FlashcardDeckSummary {
  return {
    id: "bbc-daily",
    slug: "bbc-daily",
    title: "BBC World Service Daily Brief – 2026-07-23",
    sourceKind: "bbc",
    category: "Reading Briefs",
    sourceLabel: "BBC",
    language: "english",
    cardCount: 10,
    modifiedAt: "2026-07-23T12:00:00.000Z",
    modifiedAtLabel: "Jul 23, 2026",
    sourceNoteHref: "/life-lab/reading-briefs/bbc-daily",
    sourceNoteTitle: "BBC World Service Daily Brief – 2026-07-23",
    sourceSectionId: "reading-briefs",
    tags: [],
    searchText: "bbc world service daily brief",
    parseIssues: [],
    cards: [],
    origin: "dedicated",
    ...overrides,
  };
}

describe("flashcard explore header dedupe", () => {
  it("shortens BBC World Service titles and strips embedded dates", () => {
    const titles = shortenFlashcardDeckTitle(
      "BBC World Service Daily Brief – 2026-07-23",
    );

    assert.equal(titles.fullTitle, "BBC World Service Daily Brief – 2026-07-23");
    assert.equal(titles.displayTitle, "BBC Daily Brief");
    assert.equal(titles.shortTitle, "BBC Daily Brief");
  });

  it("truncates long titles with an ellipsis", () => {
    const titles = shortenFlashcardDeckTitle(
      "An Extremely Long Technical Deck Title About Mass Spectrometry Instrumentation",
      28,
    );

    assert.ok(titles.shortTitle.endsWith("…"));
    assert.ok(titles.shortTitle.length <= 28);
  });

  it("treats identical deck and source titles as equivalent", () => {
    assert.equal(
      titlesAreEquivalent(
        "BBC World Service Daily Brief",
        "bbc world service daily brief!",
      ),
      true,
    );
  });

  it("shows a From section line instead of repeating the deck title", () => {
    const header = resolveFlashcardDeckHeader({
      title: "BBC World Service Daily Brief – 2026-07-23",
      sourceNoteTitle: "BBC World Service Daily Brief – 2026-07-23",
      sourceNoteHref: "/life-lab/reading-briefs/bbc-daily",
      sourceSectionId: "reading-briefs",
      category: "Reading Briefs",
    });

    assert.equal(header.sourceLine, "From Reading Briefs");
    assert.equal(header.showOpenSourceNote, true);
    assert.equal(header.shortTitle, "BBC Daily Brief");
    assert.doesNotMatch(header.sourceLine ?? "", /BBC World Service Daily Brief/);
  });

  it("omits source line when there is no distinct source metadata", () => {
    const header = resolveFlashcardDeckHeader({
      title: "Mass Spectrometry",
      sourceNoteTitle: "Mass Spectrometry",
      sourceNoteHref: null,
      sourceSectionId: null,
      category: null,
    });

    assert.equal(header.sourceLine, null);
    assert.equal(header.showOpenSourceNote, false);
  });
});

describe("flashcard library card model", () => {
  it("removes BBC title date from display title but keeps metadata date", () => {
    const titles = resolveFlashcardDeckDisplayTitle({
      title: "BBC World Service Daily Brief – 2026-07-23",
    });
    const card = resolveFlashcardLibraryCardModel(sampleDeck());

    assert.equal(titles.displayTitle, "BBC Daily Brief");
    assert.equal(titles.dateFromTitle, "2026-07-23");
    assert.equal(titles.canonicalTitle, "BBC World Service Daily Brief – 2026-07-23");
    assert.equal(card.displayTitle, "BBC Daily Brief");
    assert.equal(card.dateLabel, "Jul 23, 2026");
    assert.equal(card.canonicalTitle, titles.canonicalTitle);
    assert.match(card.ariaLabel, /BBC World Service Daily Brief – 2026-07-23/);
  });

  it("does not repeat identical source-note titles in card metadata", () => {
    const card = resolveFlashcardLibraryCardModel(sampleDeck());

    assert.doesNotMatch(card.displayTitle, /2026-07-23/);
    assert.equal(card.metaSegments.includes("Reading Brief"), true);
    assert.ok(!card.metaSegments.some((part) => /From:/i.test(part)));
    assert.ok(
      !card.metaSegments.some((part) =>
        /BBC World Service Daily Brief/i.test(part),
      ),
    );
  });

  it("keeps meaningful titles unchanged", () => {
    const titles = resolveFlashcardDeckDisplayTitle({
      title: "The Great Library of Alexandria",
    });

    assert.equal(titles.displayTitle, "The Great Library of Alexandria");
  });

  it("normalizes source labels for cards", () => {
    assert.equal(
      flashcardLibrarySourceLabel({
        sourceKind: "youtube",
        sourceSectionId: "youtube-learning",
      }),
      "YouTube",
    );
    assert.equal(
      flashcardLibrarySourceLabel({
        sourceKind: "bbc",
        sourceSectionId: "reading-briefs",
        category: "Reading Briefs",
      }),
      "Reading Brief",
    );
    assert.equal(
      flashcardLibrarySourceLabel({
        sourceKind: "podcasts",
      }),
      "Podcast",
    );
  });

  it("omits language when a language filter is active", () => {
    const card = resolveFlashcardLibraryCardModel(sampleDeck(), {
      language: "english",
    });

    assert.ok(!card.metaSegments.includes("English"));
    assert.match(card.ariaLabel, /English/);
  });

  it("omits source badge when it matches the active source filter", () => {
    const youtube = resolveFlashcardLibraryCardModel(
      sampleDeck({
        title: "The Great Library of Alexandria",
        sourceKind: "youtube",
        sourceSectionId: "youtube-learning",
        sourceNoteTitle: "The Great Library of Alexandria",
        category: null,
        cardCount: 5,
        modifiedAtLabel: "Jul 21, 2026",
      }),
      { sourceKind: "youtube" },
    );

    assert.ok(!youtube.metaSegments.includes("YouTube"));
    assert.match(youtube.ariaLabel, /YouTube/);
  });

  it("keeps Reading Brief when BBC filter is active", () => {
    const card = resolveFlashcardLibraryCardModel(sampleDeck(), {
      sourceKind: "bbc",
    });

    assert.equal(card.metaSegments.includes("Reading Brief"), true);
    assert.ok(!card.metaSegments.includes("BBC"));
  });

  it("remains understandable with no filters active", () => {
    const bbc = resolveFlashcardLibraryCardModel(sampleDeck());
    const youtube = resolveFlashcardLibraryCardModel(
      sampleDeck({
        id: "alexandria",
        slug: "alexandria",
        title: "The Great Library of Alexandria",
        sourceKind: "youtube",
        sourceSectionId: "youtube-learning",
        sourceNoteTitle: "The Great Library of Alexandria",
        category: null,
        cardCount: 5,
        modifiedAtLabel: "Jul 21, 2026",
      }),
    );

    assert.deepEqual(bbc.metaSegments, ["English", "Reading Brief"]);
    assert.equal(bbc.cardCountLabel, "10 cards");
    assert.deepEqual(youtube.metaSegments, ["English", "YouTube"]);
    assert.equal(youtube.displayTitle, "The Great Library of Alexandria");
  });

  it("shows card count once in the model", () => {
    const card = resolveFlashcardLibraryCardModel(sampleDeck());
    const countMatches = card.ariaLabel.match(/10 cards/g) ?? [];

    assert.equal(card.cardCountLabel, "10 cards");
    assert.equal(countMatches.length, 1);
    assert.ok(!card.metaSegments.includes("10 cards"));
  });

  it("prefers an explicit display title", () => {
    const titles = resolveFlashcardDeckDisplayTitle({
      title: "BBC World Service Daily Brief – 2026-07-23",
      displayTitle: "Daily Brief",
    });

    assert.equal(titles.displayTitle, "Daily Brief");
    assert.equal(titles.canonicalTitle, "BBC World Service Daily Brief – 2026-07-23");
  });
});
