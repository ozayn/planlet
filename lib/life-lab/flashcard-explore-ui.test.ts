import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveFlashcardDeckHeader,
  shortenFlashcardDeckTitle,
  titlesAreEquivalent,
} from "@/lib/life-lab/flashcard-explore-ui";

describe("flashcard explore header dedupe", () => {
  it("shortens BBC World Service titles for mobile", () => {
    const titles = shortenFlashcardDeckTitle(
      "BBC World Service Daily Brief – 2026-07-23",
    );

    assert.equal(titles.fullTitle, "BBC World Service Daily Brief – 2026-07-23");
    assert.equal(titles.displayTitle, "BBC World Service Daily Brief");
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
