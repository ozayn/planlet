import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("flashcards library deck list", () => {
  const root = join(import.meta.dirname, "../..");
  const decksPage = readFileSync(
    join(root, "components/life-lab/flashcards-page-content.tsx"),
    "utf8",
  );
  const sectionPage = readFileSync(
    join(root, "app/(app)/life-lab/[section]/page.tsx"),
    "utf8",
  );

  it("uses compact library cards without From: or duplicated source titles", () => {
    assert.match(decksPage, /data-flashcards-layout="decks-v2"/);
    assert.match(decksPage, /data-flashcard-deck-card/);
    assert.match(decksPage, /resolveFlashcardLibraryCardModel/);
    assert.match(decksPage, /line-clamp-2/);
    assert.match(decksPage, /aria-label=\{card\.ariaLabel\}/);
    assert.match(decksPage, /title=\{card\.canonicalTitle\}/);
    assert.match(decksPage, /focus-visible:ring-2/);
    assert.doesNotMatch(decksPage, /FlashcardSourceLink/);
    assert.doesNotMatch(decksPage, /From:/);
  });

  it("keeps the entire deck card clickable with mobile-friendly metadata", () => {
    assert.match(decksPage, /data-flashcard-deck-card=""/);
    assert.match(decksPage, /<Link[\s\S]*?aria-label=\{card\.ariaLabel\}/);
    assert.match(decksPage, /sm:hidden/);
    assert.match(decksPage, /hidden shrink-0[\s\S]*?sm:inline/);
    assert.match(decksPage, /mobileDetail/);
  });

  it("drops the explanatory Flashcards subtitle", () => {
    assert.match(sectionPage, /title="Flashcards"/);
    assert.doesNotMatch(
      sectionPage,
      /Browse and explore Life Lab flashcard decks/,
    );
  });
});
