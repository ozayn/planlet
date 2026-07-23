import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  buildDictionaryMatchIndex,
  enrichFlashcardsWithDictionaryLinks,
  findFlashcardDecksForDictionaryEntry,
  inferVocabularyTermFromCard,
  matchDictionaryTerm,
  normalizeDictionaryMatchKey,
  resolveFlashcardDictionaryLink,
} from "@/lib/life-lab/flashcard-dictionary-link";
import type { FlashcardDeckSummary } from "@/lib/life-lab/flashcard-decks";

function dictionaryNote(
  overrides: Partial<LifeLabNoteSummary> &
    Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: "words",
    fileId: overrides.slug,
    relativePath: `words/${overrides.slug}.md`,
    ...overrides,
  };
}

describe("flashcard dictionary linking", () => {
  const notes = [
    dictionaryNote({
      slug: "mass-spectrometry",
      title: "Mass Spectrometry",
      metadata: {
        type: "dictionary-entry",
        term: "mass spectrometry",
        aliases: ["MS", "mass-spec"],
      },
    }),
    dictionaryNote({
      slug: "chiaroscuro",
      title: "Chiaroscuro",
      metadata: {
        type: "dictionary-entry",
        display_title: "Chiaroscuro",
        term: "chiaroscuro",
      },
    }),
    dictionaryNote({
      slug: "nur",
      title: "نور",
      metadata: {
        type: "dictionary-entry",
        term: "نور",
        aliases: ["noor"],
        language: "persian",
      },
    }),
    dictionaryNote({
      slug: "mixed-phrase",
      title: "Light / نور",
      metadata: {
        type: "dictionary-entry",
        term: "Light / نور",
        aliases: ["light and nur"],
      },
    }),
    dictionaryNote({
      slug: "ambiguous-a",
      title: "Buffer A",
      metadata: {
        type: "dictionary-entry",
        term: "buffer",
      },
    }),
    dictionaryNote({
      slug: "ambiguous-b",
      title: "Buffer B",
      metadata: {
        type: "dictionary-entry",
        aliases: ["buffer"],
      },
    }),
  ];

  const index = buildDictionaryMatchIndex(notes);

  it("matches an exact normalized phrase", () => {
    const result = matchDictionaryTerm("Mass Spectrometry", index);
    assert.equal(result.status, "matched");
    if (result.status === "matched") {
      assert.equal(result.entry.slug, "mass-spectrometry");
      assert.equal(result.entry.href, "/learning-dictionary/mass-spectrometry");
    }
  });

  it("matches aliases", () => {
    const result = matchDictionaryTerm("MS", index);
    assert.equal(result.status, "matched");
    if (result.status === "matched") {
      assert.equal(result.entry.slug, "mass-spectrometry");
    }
  });

  it("is case and punctuation insensitive", () => {
    assert.equal(
      normalizeDictionaryMatchKey("Mass-Spectrometry!"),
      normalizeDictionaryMatchKey("mass spectrometry"),
    );
    const result = matchDictionaryTerm("MASS-SPECTROMETRY!", index);
    assert.equal(result.status, "matched");
  });

  it("omits links when matches are ambiguous", () => {
    const result = matchDictionaryTerm("buffer", index);
    assert.equal(result.status, "ambiguous");
    if (result.status === "ambiguous") {
      assert.equal(result.entries.length, 2);
    }

    const link = resolveFlashcardDictionaryLink(
      {
        question: "What does “buffer” mean?",
        answer: "A solution that resists pH change.",
        cardType: "vocabulary",
      },
      index,
    );
    assert.equal(link.href, null);
    assert.equal(link.ambiguity.length, 2);
  });

  it("returns none when there is no match", () => {
    const result = matchDictionaryTerm("quantum foam", index);
    assert.equal(result.status, "none");
    const link = resolveFlashcardDictionaryLink(
      {
        question: "What does “quantum foam” mean?",
        answer: "Unknown.",
        cardType: "vocabulary",
      },
      index,
    );
    assert.equal(link.href, null);
    assert.equal(link.ambiguity.length, 0);
  });

  it("matches Persian terms", () => {
    const result = matchDictionaryTerm("نور", index);
    assert.equal(result.status, "matched");
    if (result.status === "matched") {
      assert.equal(result.entry.slug, "nur");
    }
  });

  it("matches mixed-language terms", () => {
    const result = matchDictionaryTerm("Light / نور", index);
    assert.equal(result.status, "matched");
    if (result.status === "matched") {
      assert.equal(result.entry.slug, "mixed-phrase");
    }
  });

  it("prefers explicit TERM metadata over question inference", () => {
    assert.equal(
      inferVocabularyTermFromCard({
        question: "What does “wrong” mean?",
        cardType: "vocabulary",
        term: "chiaroscuro",
      }),
      "chiaroscuro",
    );

    const enriched = enrichFlashcardsWithDictionaryLinks(
      [
        {
          question: "What does “wrong” mean?",
          answer: "Light and dark.",
          cardType: "vocabulary",
          term: "chiaroscuro",
        },
      ],
      index,
    );

    assert.equal(
      enriched[0]?.dictionaryHref,
      "/learning-dictionary/chiaroscuro",
    );
  });

  it("infers terms from common vocabulary question patterns", () => {
    assert.equal(
      inferVocabularyTermFromCard({
        question: "What does “mass spectrometry” mean?",
        cardType: "vocabulary",
      }),
      "mass spectrometry",
    );
    assert.equal(
      inferVocabularyTermFromCard({
        question: "What is chiaroscuro?",
        cardType: "vocabulary",
      }),
      "chiaroscuro",
    );
    assert.equal(
      inferVocabularyTermFromCard({
        question: "Complete the phrase: light and nur",
        cardType: "vocabulary",
      }),
      "light and nur",
    );
  });

  it("finds reverse flashcard deck links for a dictionary entry", () => {
    const decks: FlashcardDeckSummary[] = [
      {
        id: "youtube__ms",
        slug: "youtube__ms",
        title: "Mass Spec deck",
        sourceKind: "youtube",
        category: null,
        sourceLabel: null,
        language: "english",
        cardCount: 1,
        modifiedAt: null,
        modifiedAtLabel: null,
        sourceNoteHref: null,
        sourceNoteTitle: null,
        sourceSectionId: "flashcards",
        tags: [],
        searchText: "",
        parseIssues: [],
        cards: [
          {
            question: "What does “mass spectrometry” mean?",
            answer: "A technique…",
            cardType: "vocabulary",
          },
        ],
        origin: "dedicated",
      },
    ];

    const links = findFlashcardDecksForDictionaryEntry({
      decks,
      entry: {
        slug: "mass-spectrometry",
        title: "Mass Spectrometry",
        metadata: {
          term: "mass spectrometry",
          aliases: ["MS"],
        },
      },
    });

    assert.equal(links.length, 1);
    assert.equal(links[0]?.href, "/life-lab/flashcards/youtube__ms");
    assert.doesNotMatch(links[0]!.href, /\.\./);
  });
});
