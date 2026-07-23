import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("flashcards Life Lab wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("registers flashcards section and mounts deck browser", () => {
    const constants = readFileSync(
      join(root, "lib/life-lab/constants.ts"),
      "utf8",
    );
    const sectionPage = readFileSync(
      join(root, "app/(app)/life-lab/[section]/page.tsx"),
      "utf8",
    );
    const home = readFileSync(join(root, "app/(app)/life-lab/page.tsx"), "utf8");

    assert.match(constants, /flashcards:\s*\{\s*label: "Flashcards"/);
    assert.match(sectionPage, /section === "flashcards"/);
    assert.match(sectionPage, /<FlashcardsPageContent/);
    assert.match(sectionPage, /getLifeLabFlashcardSummary/);
    assert.match(sectionPage, /Study all ·/);
    assert.match(home, /getLifeLabFlashcardSummary/);
    assert.match(home, /lifeLabSectionIconMap/);
    assert.match(home, /Layers3|lifeLabSectionIconMap/);
    assert.doesNotMatch(home, /Layers2/);
  });

  it("uses Explore-first flashcard UI with reveal and export", () => {
    const explore = readFileSync(
      join(root, "components/life-lab/flashcard-explore.tsx"),
      "utf8",
    );
    const decksPage = readFileSync(
      join(root, "components/life-lab/flashcards-page-content.tsx"),
      "utf8",
    );

    assert.doesNotMatch(explore, /Tap to reveal answer/);
    assert.match(explore, /Show all cards/);
    assert.match(explore, /serializeMemoNextDeck/);
    assert.match(explore, /FlashcardReadAloudControls/);
    assert.match(explore, /aria-expanded=\{session\.revealed\}/);
    assert.match(explore, /data-flashcard-layout="card-first"/);
    assert.match(explore, /cursor-pointer/);
    assert.match(explore, /Activate to reveal/);
    assert.doesNotMatch(explore, /correct|incorrect|score/i);
    assert.match(decksPage, /No Life Lab flashcard decks have been created yet/);
    assert.match(decksPage, /data-flashcards-layout="decks-v2"/);
  });

  it("links notes to flashcards view without making it default", () => {
    const header = readFileSync(
      join(root, "components/life-lab/life-lab-note-detail-header.tsx"),
      "utf8",
    );
    const modeTabs = readFileSync(
      join(root, "components/life-lab/life-lab-mode-tabs.tsx"),
      "utf8",
    );
    const notePage = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );

    assert.match(header, /label: "Flashcards"/);
    assert.match(header, /\?view=flashcards/);
    assert.doesNotMatch(header, /Flashcards · \{flashcardCount\} cards/);
    assert.match(modeTabs, /data-life-lab-mode-tabs/);
    assert.match(notePage, /view === "flashcards"/);
    assert.match(notePage, /section === "flashcards"/);
  });

  it("resolves Learning Dictionary links for Explore cards", () => {
    const explore = readFileSync(
      join(root, "components/life-lab/flashcard-explore.tsx"),
      "utf8",
    );
    const data = readFileSync(
      join(root, "lib/learning-dictionary/data.ts"),
      "utf8",
    );
    const entry = readFileSync(
      join(root, "components/learning-dictionary/learning-dictionary-entry.tsx"),
      "utf8",
    );

    assert.match(explore, /Open dictionary entry/);
    assert.match(explore, /currentCard\?\.dictionaryHref/);
    assert.match(data, /enrichFlashcardsWithLearningDictionary/);
    assert.match(entry, /relatedFlashcardDecks/);
    assert.match(entry, /Flashcard decks/);
  });
});
