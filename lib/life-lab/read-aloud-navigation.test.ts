import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import {
  getFirstChunkIndexForSectionId,
  getNextChunkIndexFromRanges,
  getNextSectionFirstChunkIndex,
  getPreviousSectionFirstChunkIndex,
} from "@/lib/life-lab/read-aloud-navigation";
import { buildReadAloudSections } from "@/lib/life-lab/read-aloud-sections";

function buildSamplePlan() {
  return buildReadAloudPlaybackPlan(
    buildReadAloudSections({
      title: "Sample",
      content: [
        "## Short version",
        "Short.",
        "## Summary",
        "Summary text that is long enough to require multiple chunks when limited.",
        "## Key ideas",
        "- One",
        "- Two",
      ].join("\n"),
    }),
    40,
  );
}

describe("read aloud navigation", () => {
  it("starts playback at the selected section", () => {
    const plan = buildSamplePlan();
    const keyIdeas = plan.sections.find((section) => section.title === "Key ideas");
    const keyIdeasRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Key ideas",
    );

    assert.ok(keyIdeas);
    assert.ok(keyIdeasRange);
    assert.equal(
      getFirstChunkIndexForSectionId(plan.sectionChunkRanges, keyIdeas.id),
      keyIdeasRange?.firstChunkIndex ?? null,
    );
  });

  it("auto-continues through sections when enabled", () => {
    const plan = buildSamplePlan();
    const summaryRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Summary",
    );

    assert.ok(summaryRange);
    const lastSummaryChunk =
      summaryRange.firstChunkIndex + summaryRange.chunkCount - 1;
    const nextChunk = getNextChunkIndexFromRanges(
      plan.sectionChunkRanges,
      lastSummaryChunk,
      { autoContinue: true, playOnlySection: false },
    );
    const keyIdeasRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Key ideas",
    );

    assert.equal(nextChunk, keyIdeasRange?.firstChunkIndex ?? null);
  });

  it("stops after the current section when auto-continue is off", () => {
    const plan = buildSamplePlan();
    const summaryRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Summary",
    );

    assert.ok(summaryRange);
    const lastSummaryChunk =
      summaryRange.firstChunkIndex + summaryRange.chunkCount - 1;

    assert.equal(
      getNextChunkIndexFromRanges(plan.sectionChunkRanges, lastSummaryChunk, {
        autoContinue: false,
        playOnlySection: false,
      }),
      null,
    );
  });

  it("respects play-only-section mode", () => {
    const plan = buildSamplePlan();
    const summaryRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Summary",
    );

    assert.ok(summaryRange);

    assert.equal(
      getNextChunkIndexFromRanges(
        plan.sectionChunkRanges,
        summaryRange.firstChunkIndex,
        { autoContinue: true, playOnlySection: true },
      ),
      summaryRange.firstChunkIndex + 1,
    );
    assert.equal(
      getNextChunkIndexFromRanges(
        plan.sectionChunkRanges,
        summaryRange.firstChunkIndex + summaryRange.chunkCount - 1,
        { autoContinue: true, playOnlySection: true },
      ),
      null,
    );
  });

  it("handles previous and next section boundaries", () => {
    const plan = buildSamplePlan();
    const ranges = plan.sectionChunkRanges;

    assert.equal(getPreviousSectionFirstChunkIndex(ranges, 0), null);
    assert.equal(
      getPreviousSectionFirstChunkIndex(ranges, 1),
      ranges[0]?.firstChunkIndex ?? null,
    );
    assert.equal(
      getNextSectionFirstChunkIndex(ranges, ranges.length - 1),
      null,
    );
    assert.equal(
      getNextSectionFirstChunkIndex(ranges, 0),
      ranges[1]?.firstChunkIndex ?? null,
    );
  });
});
