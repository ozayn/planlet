import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COACHING_READ_ALOUD_SECTION_IDS,
  buildCoachingReadAloudPlaybackPlan,
  buildCoachingReadAloudSections,
} from "@/lib/coaching/read-aloud-sections";
import {
  getFirstChunkIndexForSectionId,
  getPreviousSectionFirstChunkIndex,
  getNextSectionFirstChunkIndex,
} from "@/lib/life-lab/read-aloud-navigation";

describe("coaching read aloud sections", () => {
  it("preserves visible section order", () => {
    const sections = buildCoachingReadAloudSections({
      reflection: "You have been steady with morning planning.",
      question: "What felt most useful this week?",
      experiment: "Try a five-minute evening review.",
    });

    assert.deepEqual(
      sections.map((section) => section.id),
      [
        COACHING_READ_ALOUD_SECTION_IDS.REFLECTION,
        COACHING_READ_ALOUD_SECTION_IDS.QUESTION,
        COACHING_READ_ALOUD_SECTION_IDS.EXPERIMENT,
      ],
    );
    assert.deepEqual(
      sections.map((section) => section.title),
      ["Reflection", "Question for you", "Small experiment"],
    );
  });

  it("skips empty optional sections", () => {
    const sections = buildCoachingReadAloudSections({
      reflection: "Keep noticing what restores you.",
      question: null,
      experiment: "  ",
    });

    assert.deepEqual(sections.map((section) => section.id), [
      COACHING_READ_ALOUD_SECTION_IDS.REFLECTION,
    ]);
  });

  it("uses the same section ids for device voice and openai playback plans", () => {
    const content = {
      reflection: "Reflection body.",
      question: "Question body?",
      experiment: "Experiment body.",
    };

    const sectionIds = buildCoachingReadAloudSections(content).map(
      (section) => section.id,
    );
    const planSectionIds = buildCoachingReadAloudPlaybackPlan(content).sections.map(
      (section) => section.id,
    );
    const chunkSectionIds = [
      ...new Set(
        buildCoachingReadAloudPlaybackPlan(content).chunks.map(
          (chunk) => chunk.sectionId,
        ),
      ),
    ];

    assert.deepEqual(planSectionIds, sectionIds);
    assert.deepEqual(chunkSectionIds, sectionIds);
  });

  it("supports section jump and previous/next boundaries", () => {
    const plan = buildCoachingReadAloudPlaybackPlan({
      reflection: "Reflection body.",
      question: "Question body?",
      experiment: "Experiment body.",
    });

    const middleIndex = 1;
    const middleSectionId = plan.sections[middleIndex]?.id;

    assert.ok(middleSectionId);
    assert.equal(
      getFirstChunkIndexForSectionId(plan.sectionChunkRanges, middleSectionId),
      plan.sectionChunkRanges[middleIndex]?.firstChunkIndex,
    );
    assert.equal(
      getPreviousSectionFirstChunkIndex(plan.sectionChunkRanges, middleIndex),
      plan.sectionChunkRanges[0]?.firstChunkIndex,
    );
    assert.equal(
      getNextSectionFirstChunkIndex(plan.sectionChunkRanges, middleIndex),
      plan.sectionChunkRanges[2]?.firstChunkIndex,
    );
    assert.equal(
      getPreviousSectionFirstChunkIndex(plan.sectionChunkRanges, 0),
      null,
    );
    assert.equal(
      getNextSectionFirstChunkIndex(
        plan.sectionChunkRanges,
        plan.sections.length - 1,
      ),
      null,
    );
  });
});
