import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firstSentenceForIdeaTitle,
  validateCreateIdeaInput,
  validateUpdateIdeaInput,
} from "@/lib/ideas";
import {
  normalizeIdeaTags,
  parseIdeaTagsInput,
  type SerializedIdea,
} from "@/lib/ideas/constants";
import { filterIdeas, matchesIdeaSearch } from "@/lib/ideas/search";
import { canUseIdeasFeatures } from "@/lib/roles";

const TIMEZONE = "America/Los_Angeles";

function idea(overrides: Partial<SerializedIdea> = {}): SerializedIdea {
  return {
    id: "idea-1",
    title: "Photo zine of border towns",
    content: "A small printed zine collecting photos from border towns.",
    category: "PHOTOGRAPHY",
    categoryLabel: "Photography",
    status: "NEW",
    statusLabel: "New",
    tags: ["zine", "printing"],
    notes: null,
    ideaDate: "2026-07-05",
    ideaDateLabel: "Jul 5, 2026",
    createdAt: "2026-07-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("create idea validation", () => {
  it("accepts content-only ideas and derives a title", () => {
    const derived = validateCreateIdeaInput(
      { content: "Build a tiny planning widget. It should live on the home screen." },
      TIMEZONE,
    );

    assert.equal(derived.title, "Build a tiny planning widget.");
    assert.equal(derived.status, "NEW");
    assert.equal(derived.category, null);
  });

  it("accepts title-only ideas", () => {
    const derived = validateCreateIdeaInput({ title: "Idea sketchbook" }, TIMEZONE);

    assert.equal(derived.title, "Idea sketchbook");
    assert.equal(derived.content, "Idea sketchbook");
  });

  it("rejects completely empty ideas", () => {
    assert.throws(
      () => validateCreateIdeaInput({}, TIMEZONE),
      /Add an idea, title, or notes/,
    );
  });

  it("defaults the idea date to today and validates dates", () => {
    const derived = validateCreateIdeaInput({ content: "Quick thought" }, TIMEZONE);

    assert.ok(derived.ideaDate instanceof Date);
    assert.throws(
      () =>
        validateCreateIdeaInput(
          { content: "Quick thought", ideaDate: "not-a-date" },
          TIMEZONE,
        ),
      /Invalid date/,
    );
  });

  it("truncates long unpunctuated content titles to 80 characters", () => {
    const derived = validateCreateIdeaInput(
      { content: "A".repeat(120) },
      TIMEZONE,
    );

    assert.equal(derived.title.length, 80);
    assert.match(derived.title, /…$/);
  });
});

describe("update idea validation", () => {
  it("accepts status changes through the lifecycle", () => {
    const derived = validateUpdateIdeaInput(
      { content: "Refine the zine idea", status: "EXPLORING" },
      TIMEZONE,
    );

    assert.equal(derived.status, "EXPLORING");
  });

  it("rejects invalid categories", () => {
    assert.throws(
      () =>
        validateUpdateIdeaInput(
          {
            content: "Test",
            category: "NOT_A_CATEGORY" as never,
          },
          TIMEZONE,
        ),
      /Invalid category/,
    );
  });
});

describe("idea title derivation", () => {
  it("uses the first sentence when punctuation is present", () => {
    assert.equal(
      firstSentenceForIdeaTitle("Ship small. Iterate often."),
      "Ship small.",
    );
  });
});

describe("idea tags", () => {
  it("parses comma-separated tag input and dedupes", () => {
    assert.deepEqual(parseIdeaTagsInput("zine, printing, Zine, , photo"), [
      "zine",
      "printing",
      "photo",
    ]);
  });

  it("caps tags at twelve like learning themes", () => {
    const tags = normalizeIdeaTags(
      Array.from({ length: 20 }, (_, index) => `tag-${index}`),
    );

    assert.equal(tags.length, 12);
  });
});

describe("idea search and filters", () => {
  it("matches title, body, and tags", () => {
    const sample = idea();

    assert.equal(matchesIdeaSearch(sample, "border towns"), true);
    assert.equal(matchesIdeaSearch(sample, "printed zine"), true);
    assert.equal(matchesIdeaSearch(sample, "printing"), true);
    assert.equal(matchesIdeaSearch(sample, "podcast"), false);
  });

  it("filters by status chips", () => {
    const ideas = [
      idea({ id: "new-idea", status: "NEW", statusLabel: "New" }),
      idea({ id: "building-idea", status: "BUILDING", statusLabel: "Building" }),
      idea({ id: "archived-idea", status: "ARCHIVED", statusLabel: "Archived" }),
    ];

    assert.deepEqual(
      filterIdeas(ideas, { filter: "all" }).map((item) => item.id),
      ["new-idea", "building-idea", "archived-idea"],
    );
    assert.deepEqual(
      filterIdeas(ideas, { filter: "BUILDING" }).map((item) => item.id),
      ["building-idea"],
    );
    assert.deepEqual(
      filterIdeas(ideas, { filter: "ARCHIVED", query: "zine" }).map(
        (item) => item.id,
      ),
      ["archived-idea"],
    );
  });

  it("returns nothing when the query matches no ideas", () => {
    assert.deepEqual(filterIdeas([idea()], { query: "spaceship" }), []);
  });
});

describe("ideas feature access", () => {
  it("allows admins and explicitly flagged users only", () => {
    assert.equal(canUseIdeasFeatures({ role: "ADMIN" }), true);
    assert.equal(
      canUseIdeasFeatures({ role: "USER", canUseIdeasFeatures: true }),
      true,
    );
    assert.equal(
      canUseIdeasFeatures({ role: "USER", canUseIdeasFeatures: false }),
      false,
    );
    assert.equal(canUseIdeasFeatures({ role: "USER" }), false);
  });
});
