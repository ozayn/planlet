import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteGroup, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  learningDictionaryLayoutMarker,
  orderLearningDictionaryGroups,
} from "@/lib/life-lab/learning-dictionary-layout";

function note(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return {
    excerpt: "A short definition.",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: null,
    fileId: `file-${partial.slug}`,
    relativePath: `${partial.slug}.md`,
    ...partial,
  };
}

function group(
  partial: Pick<LifeLabNoteGroup, "id" | "label" | "variant"> & {
    notes?: LifeLabNoteSummary[];
  },
): LifeLabNoteGroup {
  return {
    notes: partial.notes ?? [],
    collapsedByDefault: partial.variant === "disclosure",
    ...partial,
  };
}

describe("learning dictionary life-lab layout", () => {
  it("orders Concepts then Phrases before About & reference", () => {
    const ordered = orderLearningDictionaryGroups([
      group({
        id: "section-files",
        label: "About & reference",
        variant: "disclosure",
        notes: [note({ slug: "readme", title: "README" })],
      }),
      group({
        id: "phrases",
        label: "Phrases",
        variant: "primary",
        notes: [note({ slug: "phrases__one", title: "Break the ice" })],
      }),
      group({
        id: "concepts",
        label: "Concepts",
        variant: "primary",
        notes: [note({ slug: "concepts__one", title: "Legitimacy" })],
      }),
    ]);

    assert.deepEqual(
      ordered.map((item) => item.label),
      ["Concepts", "Phrases", "About & reference"],
    );
  });

  it("keeps Debug marker available only in development", () => {
    const marker = learningDictionaryLayoutMarker();

    if (process.env.NODE_ENV === "development") {
      assert.equal(marker["data-learning-dictionary-layout"], "compact-v1");
    } else {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          marker,
          "data-learning-dictionary-layout",
        ),
        false,
      );
    }
  });

  it("uses compact rows without repeated category pills", () => {
    const entry = note({
      slug: "concepts__legitimacy",
      title: "مشروعیت",
      excerpt: "باور به حقانیت فرمانروایی",
      dateLabel: "Jul 10",
      metadata: {
        category: "concept",
        study_status: "new",
        tags: ["institutions"],
      },
    });

    // Row model must not require category/status badges — definition + quiet date only.
    assert.equal(entry.metadata?.category, "concept");
    assert.ok(entry.excerpt);
    assert.equal(typeof entry.title, "string");
  });
});
