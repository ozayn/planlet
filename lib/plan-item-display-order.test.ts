import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SerializedPlanItem } from "@/lib/plan-serialize";

import { orderPlanItemsForDisplay } from "@/lib/plan-item-display-order";

function item(
  id: string,
  status: SerializedPlanItem["status"],
  sortOrder: number,
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
    themeId: null,
    themeName: null,
    projectId: null,
    projectName: null,
    commentCount: 0,
    subtasks: [],
  };
}

describe("orderPlanItemsForDisplay", () => {
  it("moves completed items to the top while preserving relative order", () => {
    const items = [
      item("a", "OPEN", 0),
      item("b", "OPEN", 100),
      item("c", "DONE", 200),
      item("d", "OPEN", 300),
      item("e", "DONE", 400),
    ];

    assert.deepEqual(
      orderPlanItemsForDisplay(items).map((entry) => entry.id),
      ["c", "e", "a", "b", "d"],
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
