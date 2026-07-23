import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  formatContentCount,
  formatSectionContentMeta,
} from "@/lib/life-lab/collection-metadata";
import {
  getLifeLabSectionIcon,
  lifeLabSectionIconMap,
} from "@/lib/life-lab/section-icons";
import { getAllowedLifeLabSectionIds } from "@/lib/life-lab/sections";
import {
  LIFE_LAB_FLASHCARD_SUMMARY_CACHE_VERSION,
  lifeLabFlashcardSummaryCacheKey,
} from "@/lib/life-lab/cache";

describe("Life Lab home landing UI", () => {
  const root = join(import.meta.dirname, "../..");
  const home = readFileSync(join(root, "app/(app)/life-lab/page.tsx"), "utf8");
  const browser = readFileSync(
    join(root, "components/life-lab/life-lab-home-browser.tsx"),
    "utf8",
  );
  const sectionCard = readFileSync(
    join(root, "components/life-lab/life-lab-section-card.tsx"),
    "utf8",
  );
  const icons = readFileSync(
    join(root, "lib/life-lab/section-icons.tsx"),
    "utf8",
  );

  it("uses canonical flashcard summary for landing counts", () => {
    assert.match(home, /getLifeLabFlashcardSummary/);
    assert.match(home, /formatFlashcardSectionMeta/);
    assert.match(home, /LifeLabSectionCard/);
    assert.match(home, /lifeLabSectionIconMap/);
    assert.doesNotMatch(home, /flashcardNoteCount/);
    assert.doesNotMatch(home, /Study all flashcards \(/);
  });

  it("removes detached Study all chip from under search", () => {
    assert.doesNotMatch(browser, /Study all flashcards/);
    assert.doesNotMatch(browser, /flashcardNoteCount/);
    assert.match(browser, /Search notes, topics, people, and playlists/);
  });

  it("maps a monochrome icon for every allowed section", () => {
    for (const sectionId of getAllowedLifeLabSectionIds()) {
      assert.ok(
        lifeLabSectionIconMap[sectionId],
        `missing icon for ${sectionId}`,
      );
      assert.equal(getLifeLabSectionIcon(sectionId), lifeLabSectionIconMap[sectionId]);
    }

    assert.match(icons, /Layers3/);
    assert.match(icons, /PlaySquare/);
    assert.match(sectionCard, /aria-hidden="true"/);
    assert.match(sectionCard, /text-muted/);
    assert.doesNotMatch(sectionCard, /text-(red|blue|green|purple|amber|orange)-/);
  });

  it("formats content counts consistently", () => {
    assert.equal(formatContentCount(1, "note"), "1 note");
    assert.equal(formatContentCount(2, "note"), "2 notes");
    assert.equal(formatContentCount(1, "deck"), "1 deck");
    assert.equal(formatContentCount(2, "deck"), "2 decks");
    assert.equal(formatContentCount(1, "podcast"), "1 podcast");
    assert.equal(formatContentCount(2, "podcast"), "2 podcasts");
    assert.equal(formatSectionContentMeta(0, "note"), "No items yet");
    assert.equal(formatSectionContentMeta(0, "deck"), "No items yet");
  });

  it("uses one-column mobile section grid and shared card component", () => {
    assert.match(home, /grid-cols-1/);
    assert.match(home, /sm:grid-cols-2/);
    assert.match(sectionCard, /min-h-11/);
    assert.match(sectionCard, /absolute inset-0/);
    assert.doesNotMatch(sectionCard, />\s*Open\s*</);
  });

  it("versions flashcard summary cache separately from note payloads", () => {
    assert.equal(
      lifeLabFlashcardSummaryCacheKey(),
      `life-lab-flashcard-summary:${LIFE_LAB_FLASHCARD_SUMMARY_CACHE_VERSION}`,
    );
    assert.match(LIFE_LAB_FLASHCARD_SUMMARY_CACHE_VERSION, /canonical-counts/);
  });

  it("keeps Study all on the Flashcards card using card count", () => {
    assert.match(home, /secondaryAction/);
    assert.match(home, /label: "Study all"/);
    assert.match(home, /flashcardSummary\.cardCount > 0/);
  });
});
