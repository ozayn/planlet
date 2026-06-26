import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SerializedPlanItem } from "@/lib/plan-serialize";

import { orderPlanItemsForDisplay } from "@/lib/plan-item-display-order";

function item(
  id: string,
  status: SerializedPlanItem["status"],
  sortOrder: number,
  completedAt: string | null = null,
): SerializedPlanItem {
  return {
    id,
    planId: "plan-1",
    parentItemId: null,
    title: id,
    description: null,
    type: "TASK",
    status,
    progressLevel: 0,
    satisfactionLevel: null,
    confidenceLevel: null,
    excitementLevel: null,
    importance: null,
    urgency: null,
    timeHint: null,
    startTime: null,
    endTime: null,
    durationMinutes: null,
    comment: null,
    shareable: true,
    sortOrder,
    completedAt,
    themeId: null,
    themeName: null,
    projectId: null,
    projectName: null,
    commentCount: 0,
    subtasks: [],
  };
}

describe("orderPlanItemsForDisplay", () => {
  it("sorts completed items by completedAt ascending, then open items by sortOrder", () => {
    const items = [
      item("a", "OPEN", 0),
      item("b", "OPEN", 100),
      item("c", "DONE", 400, "2026-01-02T00:00:00.000Z"),
      item("d", "OPEN", 300),
      item("e", "DONE", 200, "2026-01-01T00:00:00.000Z"),
    ];

    assert.deepEqual(
      orderPlanItemsForDisplay(items).map((entry) => entry.id),
      ["e", "c", "a", "b", "d"],
    );
  });

  it("places a newly completed item at the bottom of the done group", () => {
    const items = [
      item("a", "DONE", 0, "2026-01-01T00:00:00.000Z"),
      item("b", "DONE", 100, "2026-01-02T00:00:00.000Z"),
      item("c", "OPEN", 200),
      item("d", "DONE", 300, "2026-01-03T00:00:00.000Z"),
    ];

    assert.deepEqual(
      orderPlanItemsForDisplay(items).map((entry) => entry.id),
      ["a", "b", "d", "c"],
    );
  });

  it("keeps manual order when the preference is disabled", () => {
    const items = [
      item("a", "OPEN", 0),
      item("b", "OPEN", 100),
      item("c", "DONE", 200),
    ];

    assert.deepEqual(
      orderPlanItemsForDisplay(items, { moveCompletedToTop: false }).map(
        (entry) => entry.id,
      ),
      ["a", "b", "c"],
    );
  });
});
