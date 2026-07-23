import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectDeckLanguage,
  isMemoNextDeckText,
  parseMemoNextDeck,
  serializeMemoNextDeck,
} from "@/lib/life-lab/memonext-deck";
import {
  buildFlashcardDeckFromContent,
  filterFlashcardDecks,
  isFlashcardBlockedFolder,
  isFlashcardVisibleRelativePath,
  resolveFlashcardSourceKind,
  resolveLifeLabNoteHref,
} from "@/lib/life-lab/flashcard-decks";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";

describe("MemoNext flashcard parser", () => {
  it("parses headers and Q/A pairs with examples", () => {
    const raw = `TITLE: Mass Spectrometry
CATEGORY: Chemistry
SOURCE: Wikipedia
CARDS: 2
LIFE_LAB_NOTE: ../learning-map/topics/mass-spectrometry.md
LANGUAGE: english

Q: What is mass spectrometry?
A: A technique that measures ions by their mass-to-charge ratio.
Example: Used in proteomics.

Q: What is m/z?
A: Mass-to-charge ratio.
`;

    const parsed = parseMemoNextDeck(raw);
    assert.equal(parsed.headers.title, "Mass Spectrometry");
    assert.equal(parsed.headers.category, "Chemistry");
    assert.equal(parsed.cards.length, 2);
    assert.equal(parsed.cards[0]?.example, "Used in proteomics.");
    assert.equal(parsed.issues.length, 0);
    assert.equal(isMemoNextDeckText(raw), true);
  });

  it("supports Persian and mixed-language cards", () => {
    const raw = `TITLE: واژه‌ها
LANGUAGE: mixed

Q: What is light?
A: نور

Q: سایه چیست؟
A: Absence of light near an object.
`;

    const parsed = parseMemoNextDeck(raw);
    assert.equal(parsed.cards.length, 2);
    assert.equal(detectDeckLanguage(parsed.cards), "mixed");
  });

  it("ignores incomplete cards without inventing answers", () => {
    const raw = `TITLE: Broken
Q: Missing answer only
Q: Complete?
A: Yes
`;

    const parsed = parseMemoNextDeck(raw);
    assert.equal(parsed.cards.length, 1);
    assert.equal(parsed.cards[0]?.question, "Complete?");
    assert.ok(parsed.issues.length >= 1);
    assert.match(parsed.issues[0]!.message, /missing answer/i);
  });

  it("serializes decks back to MemoNext text", () => {
    const text = serializeMemoNextDeck({
      headers: { title: "Demo", category: "Test" },
      cards: [{ question: "Q1", answer: "A1", example: "Ex" }],
    });

    assert.match(text, /TITLE: Demo/);
    assert.match(text, /Q: Q1/);
    assert.match(text, /Example: Ex/);
  });
});

describe("embedded markdown flashcards", () => {
  it("extracts Flashcards sections and whole-file MemoNext", () => {
    const embedded = `# Note

## Flashcards

Q: One?
A: First

## Next
`;
    assert.equal(extractFlashcardsFromMarkdown(embedded).length, 1);

    const whole = `TITLE: Deck
Q: Two?
A: Second
`;
    assert.equal(extractFlashcardsFromMarkdown(whole).length, 1);
  });
});

describe("flashcard deck helpers", () => {
  it("blocks private working folders and allows deck files", () => {
    assert.equal(isFlashcardBlockedFolder("private"), true);
    assert.equal(isFlashcardBlockedFolder("transcripts"), true);
    assert.equal(isFlashcardVisibleRelativePath("youtube/demo.txt"), true);
    assert.equal(
      isFlashcardVisibleRelativePath("private/secret.txt"),
      false,
    );
  });

  it("resolves source kinds and note hrefs safely", () => {
    assert.equal(
      resolveFlashcardSourceKind({ relativePath: "youtube/demo.txt" }),
      "youtube",
    );
    const href = resolveLifeLabNoteHref({
      fromSectionId: "flashcards",
      fromRelativePath: "topics/mass-spec.txt",
      referencedPath: "../learning-map/topics/mass-spectrometry.md",
    });
    assert.ok(href);
    assert.equal(href?.sectionId, "learning-map");
    assert.match(href!.href, /^\/life-lab\/learning-map\//);
    assert.doesNotMatch(href!.displayTitle, /\.\./);
  });

  it("builds and filters deck summaries", () => {
    const deck = buildFlashcardDeckFromContent({
      slug: "youtube__demo",
      relativePath: "youtube/demo.txt",
      titleFallback: "Demo",
      content: `TITLE: YouTube Deck
CATEGORY: Science
Q: Hello?
A: World
`,
      modifiedAt: "2026-07-01T00:00:00.000Z",
      modifiedAtLabel: "Jul 1, 2026",
    });

    assert.equal(deck.title, "YouTube Deck");
    assert.equal(deck.sourceKind, "youtube");
    assert.equal(deck.cardCount, 1);

    const filtered = filterFlashcardDecks([deck], {
      sourceKind: "youtube",
      q: "hello",
      sort: "most-cards",
    });
    assert.equal(filtered.length, 1);
  });
});
