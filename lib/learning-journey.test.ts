import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firstSentenceForLearningTitle,
  validateCreateLearningEntryInput,
} from "@/lib/learning-journey";
import type { SerializedLearningEntry } from "@/lib/learning-journey/constants";
import {
  filterLearningEntries,
  matchesLearningEntrySearch,
} from "@/lib/learning-journey/search";

const TIMEZONE = "America/Los_Angeles";

function entry(
  overrides: Partial<SerializedLearningEntry> = {},
): SerializedLearningEntry {
  return {
    id: "entry-1",
    title: "Museum visit",
    summary: "Learned about impressionism.",
    sourceType: "MUSEUM",
    sourceTypeLabel: "Museum",
    sourceName: "MoMA",
    category: "ART",
    categoryLabel: "Art",
    learnedAt: "2026-06-09",
    learnedAtLabel: "Jun 9, 2026",
    notes: "Takeaway about light and color.",
    importance: 3,
    themes: ["Art"],
    createdAt: "2026-06-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("firstSentenceForLearningTitle", () => {
  it("uses the first sentence when punctuation is present", () => {
    assert.equal(
      firstSentenceForLearningTitle(
        "Small steps count. Keep going even when progress feels slow.",
      ),
      "Small steps count.",
    );
  });

  it("truncates long unpunctuated text to 80 characters", () => {
    const longText = "A".repeat(120);
    const derived = validateCreateLearningEntryInput(
      { summary: longText },
      TIMEZONE,
    );

    assert.equal(derived.title.length, 80);
    assert.match(derived.title, /…$/);
  });
});

describe("validateCreateLearningEntryInput", () => {
  it("accepts title-only entries", () => {
    const derived = validateCreateLearningEntryInput(
      { title: "Core insight" },
      TIMEZONE,
    );

    assert.equal(derived.title, "Core insight");
    assert.equal(derived.summary, "Core insight");
  });

  it("accepts notes-only entries", () => {
    const derived = validateCreateLearningEntryInput(
      { notes: "Remember to revisit this idea." },
      TIMEZONE,
    );

    assert.equal(derived.summary, "Remember to revisit this idea.");
  });

  it("rejects completely empty entries", () => {
    assert.throws(
      () => validateCreateLearningEntryInput({}, TIMEZONE),
      /Add a title, summary, or notes/,
    );
  });
});

describe("learning entry search", () => {
  it("matches title, body, source, category, and themes", () => {
    const sample = entry();

    assert.equal(matchesLearningEntrySearch(sample, "museum visit"), true);
    assert.equal(matchesLearningEntrySearch(sample, "impressionism"), true);
    assert.equal(matchesLearningEntrySearch(sample, "light and color"), true);
    assert.equal(matchesLearningEntrySearch(sample, "moma"), true);
    assert.equal(matchesLearningEntrySearch(sample, "art"), true);
    assert.equal(matchesLearningEntrySearch(sample, "podcast"), false);
  });

  it("filters meaningful entries and date ranges", () => {
    const entries = [
      entry({
        id: "old",
        importance: 2,
        learnedAt: "2026-01-10",
      }),
      entry({
        id: "recent-meaningful",
        importance: 4,
        learnedAt: "2026-06-09",
      }),
    ];

    const now = new Date("2026-06-09T18:00:00.000Z");

    assert.deepEqual(
      filterLearningEntries(entries, {
        filter: "meaningful",
        timezone: TIMEZONE,
        now,
      }).map((item) => item.id),
      ["recent-meaningful"],
    );

    assert.deepEqual(
      filterLearningEntries(entries, {
        filter: "this-month",
        timezone: TIMEZONE,
        now,
      }).map((item) => item.id),
      ["recent-meaningful"],
    );
  });
});
