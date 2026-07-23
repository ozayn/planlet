import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFlashcardDeckItemKey,
  buildNoteItemKey,
  buildPodcastEpisodeItemKey,
  buildPodcastShowItemKey,
  normalizeLifeLabIdentityPath,
} from "@/lib/life-lab/item-key";
import {
  enrichArchivedLifeLabItems,
  filterArchivedListItems,
} from "@/lib/life-lab/archived-view";
import { excludeArchivedByKey } from "@/lib/life-lab/item-state";

describe("life lab item keys", () => {
  it("builds stable flashcard and note keys without display titles", () => {
    assert.equal(
      buildFlashcardDeckItemKey(
        "bbc-world-service-daily-brief-2026-07-23",
      ),
      "flashcards:bbc-world-service-daily-brief-2026-07-23",
    );

    assert.equal(
      buildNoteItemKey({
        sectionId: "youtube-learning",
        relativePath: "2026-07-19-fifa-covering-for-dictators.md",
        slug: "2026-07-19-fifa-covering-for-dictators",
      }),
      "youtube-learning:2026-07-19-fifa-covering-for-dictators",
    );

    assert.equal(
      buildNoteItemKey({
        sectionId: "learning-dictionary",
        relativePath: "english/phrases/sportswashing.md",
        slug: "english__phrases__sportswashing",
      }),
      "learning-dictionary:english:phrases:sportswashing",
    );
  });

  it("builds independent podcast show and episode keys", () => {
    assert.equal(
      buildPodcastShowItemKey("the-daily"),
      "podcasts:show:the-daily",
    );
    assert.equal(
      buildPodcastEpisodeItemKey({
        relativePath: "the-daily/episodes/2026-07-18-zohran.md",
        slug: "the-daily__episodes__2026-07-18-zohran",
      }),
      "podcasts:the-daily:episodes:2026-07-18-zohran",
    );
  });

  it("normalizes paths deterministically", () => {
    assert.equal(
      normalizeLifeLabIdentityPath("english\\phrases\\sportswashing.MD"),
      "english:phrases:sportswashing",
    );
  });
});

describe("life lab archive filtering", () => {
  it("excludes archived keys from normal lists", () => {
    const decks = [
      { slug: "active-deck" },
      { slug: "archived-deck" },
    ];
    const archived = new Set([
      buildFlashcardDeckItemKey("archived-deck"),
    ]);

    const visible = excludeArchivedByKey(decks, archived, (deck) =>
      buildFlashcardDeckItemKey(deck.slug),
    );

    assert.deepEqual(
      visible.map((deck) => deck.slug),
      ["active-deck"],
    );
  });

  it("enriches archived items and keeps source hrefs", () => {
    const items = enrichArchivedLifeLabItems({
      archived: [
        {
          itemKey: "flashcards:bbc-daily",
          section: "flashcards",
          itemType: "flashcard-deck",
          archivedAt: new Date("2026-07-23T12:00:00Z"),
          updatedAt: new Date("2026-07-23T12:00:00Z"),
        },
      ],
      decks: [
        {
          id: "bbc-daily",
          slug: "bbc-daily",
          title: "BBC Daily Brief",
          sourceKind: "bbc",
          category: null,
          sourceLabel: null,
          language: "english",
          cardCount: 10,
          modifiedAt: null,
          modifiedAtLabel: "Jul 23, 2026",
          sourceNoteHref: "/life-lab/reading-briefs/bbc",
          sourceNoteTitle: "BBC",
          sourceSectionId: "reading-briefs",
          tags: [],
          searchText: "bbc",
          parseIssues: [],
          cards: [],
          origin: "dedicated",
        },
      ],
    });

    assert.equal(items[0]?.title, "BBC Daily Brief");
    assert.equal(items[0]?.href, "/life-lab/flashcards/bbc-daily");
    assert.match(items[0]?.archivedAtLabel ?? "", /2026/);
  });

  it("filters archived list by section and search", () => {
    const filtered = filterArchivedListItems(
      [
        {
          itemKey: "flashcards:a",
          section: "flashcards",
          sectionLabel: "Flashcards",
          itemType: "flashcard-deck",
          title: "Alpha Deck",
          href: "/life-lab/flashcards/a",
          archivedAt: new Date("2026-07-22T00:00:00Z"),
          archivedAtLabel: "Jul 22, 2026",
          meta: "5 cards",
        },
        {
          itemKey: "podcasts:b",
          section: "podcasts",
          sectionLabel: "Podcasts",
          itemType: "podcast-episode",
          title: "Beta Episode",
          href: "/life-lab/podcasts/b",
          archivedAt: new Date("2026-07-23T00:00:00Z"),
          archivedAtLabel: "Jul 23, 2026",
          meta: null,
        },
      ],
      { section: "flashcards", q: "alpha", sort: "title" },
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.title, "Alpha Deck");
  });
});
