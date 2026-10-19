import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  groupPlanItemsByPrimaryLifeArea,
  nextSelectionAfterPrimaryChange,
  normalizeLifeAreaSelection,
} from "@/lib/life-areas/group";
import {
  UNCATEGORIZED_LIFE_AREA_ID,
  UNCATEGORIZED_LIFE_AREA_LABEL,
} from "@/lib/life-areas/constants";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

function task(
  id: string,
  lifeAreas: SerializedPlanItem["lifeAreas"] = [],
): SerializedPlanItem {
  return {
    id,
    planId: "plan",
    parentItemId: null,
    title: id,
    description: null,
    type: "TASK",
    status: "OPEN",
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
    sortOrder: 0,
    completedAt: null,
    themeId: null,
    themeName: null,
    projectId: null,
    projectName: null,
    lifeAreas,
    commentCount: 0,
    subtasks: [],
  };
}

describe("normalizeLifeAreaSelection", () => {
  it("keeps one primary and unique secondaries without duplicating primary", () => {
    assert.deepEqual(
      normalizeLifeAreaSelection({
        primaryLifeAreaId: "a",
        secondaryLifeAreaIds: ["a", "b", "b", "c"],
      }),
      { primaryLifeAreaId: "a", secondaryLifeAreaIds: ["b", "c"] },
    );
  });

  it("allows uncategorized tasks", () => {
    assert.deepEqual(
      normalizeLifeAreaSelection({
        primaryLifeAreaId: null,
        secondaryLifeAreaIds: ["x"],
      }),
      { primaryLifeAreaId: null, secondaryLifeAreaIds: ["x"] },
    );
  });
});

describe("nextSelectionAfterPrimaryChange", () => {
  it("changes primary and preserves secondaries", () => {
    assert.deepEqual(
      nextSelectionAfterPrimaryChange({
        currentPrimaryId: "career",
        currentSecondaryIds: ["learn", "health"],
        nextPrimaryId: "health",
      }),
      {
        primaryLifeAreaId: "health",
        secondaryLifeAreaIds: ["learn"],
      },
    );
  });

  it("removes primary while keeping secondary associations", () => {
    assert.deepEqual(
      nextSelectionAfterPrimaryChange({
        currentPrimaryId: "career",
        currentSecondaryIds: ["learn"],
        nextPrimaryId: null,
      }),
      {
        primaryLifeAreaId: null,
        secondaryLifeAreaIds: ["learn"],
      },
    );
  });

  it("does not duplicate a task id across primary and secondary", () => {
    const next = nextSelectionAfterPrimaryChange({
      currentPrimaryId: "a",
      currentSecondaryIds: ["b", "c"],
      nextPrimaryId: "b",
    });
    assert.equal(next.primaryLifeAreaId, "b");
    assert.ok(!next.secondaryLifeAreaIds.includes("b"));
  });
});

describe("groupPlanItemsByPrimaryLifeArea", () => {
  it("shows each task once under its primary area", () => {
    const items = [
      task("t1", [
        { id: "career", name: "Career", isPrimary: true, archived: false },
        { id: "learn", name: "Learning", isPrimary: false, archived: false },
      ]),
      task("t2", [
        { id: "learn", name: "Learning", isPrimary: true, archived: false },
      ]),
      task("t3"),
    ];

    const groups = groupPlanItemsByPrimaryLifeArea(items, [
      { id: "career", name: "Career", archivedAt: null },
      { id: "learn", name: "Learning", archivedAt: null },
    ]);

    assert.equal(groups.length, 3);
    assert.deepEqual(
      groups.map((group) => [group.areaId, group.items.map((item) => item.id)]),
      [
        ["career", ["t1"]],
        ["learn", ["t2"]],
        [UNCATEGORIZED_LIFE_AREA_ID, ["t3"]],
      ],
    );
    assert.equal(groups[2]?.areaName, UNCATEGORIZED_LIFE_AREA_LABEL);
  });

  it("hides empty areas by default (share / compact exports)", () => {
    const groups = groupPlanItemsByPrimaryLifeArea(
      [task("only")],
      [
        { id: "career", name: "Career", archivedAt: null },
        { id: "health", name: "Health", archivedAt: null },
      ],
    );

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.areaId, UNCATEGORIZED_LIFE_AREA_ID);
  });

  it("includes empty active areas when requested and hides archived + empty Uncategorized", () => {
    const groups = groupPlanItemsByPrimaryLifeArea(
      [
        task("t1", [
          { id: "career", name: "Career", isPrimary: true, archived: false },
        ]),
      ],
      [
        { id: "career", name: "Career", archivedAt: null },
        { id: "health", name: "Health", archivedAt: null },
        { id: "old", name: "Archived", archivedAt: "2026-01-01T00:00:00.000Z" },
      ],
      { includeEmptyAreas: true },
    );

    assert.deepEqual(
      groups.map((group) => [group.areaId, group.items.map((item) => item.id)]),
      [
        ["career", ["t1"]],
        ["health", []],
      ],
    );
    assert.ok(!groups.some((group) => group.areaId === "old"));
    assert.ok(
      !groups.some((group) => group.areaId === UNCATEGORIZED_LIFE_AREA_ID),
    );
  });

  it("keeps Uncategorized only when it has tasks, after active areas", () => {
    const groups = groupPlanItemsByPrimaryLifeArea(
      [task("loose")],
      [
        { id: "career", name: "Career", archivedAt: null },
        { id: "health", name: "Health", archivedAt: null },
      ],
      { includeEmptyAreas: true },
    );

    assert.deepEqual(
      groups.map((group) => group.areaId),
      ["career", "health", UNCATEGORIZED_LIFE_AREA_ID],
    );
    assert.deepEqual(groups[2]?.items.map((item) => item.id), ["loose"]);
  });

  it("preserves input order within each primary group", () => {
    const items = [
      task("a", [
        { id: "career", name: "Career", isPrimary: true, archived: false },
      ]),
      task("b", [
        { id: "career", name: "Career", isPrimary: true, archived: false },
      ]),
      task("c", [
        { id: "career", name: "Career", isPrimary: true, archived: false },
      ]),
    ];

    const groups = groupPlanItemsByPrimaryLifeArea(items, [
      { id: "career", name: "Career", archivedAt: null },
    ]);

    assert.deepEqual(
      groups[0]?.items.map((item) => item.id),
      ["a", "b", "c"],
    );
  });

  it("does not render a task twice when it has secondary areas", () => {
    const items = [
      task("shared", [
        { id: "career", name: "Career", isPrimary: true, archived: false },
        { id: "learn", name: "Learning", isPrimary: false, archived: false },
        { id: "code", name: "Coding", isPrimary: false, archived: false },
      ]),
    ];

    const groups = groupPlanItemsByPrimaryLifeArea(items, [
      { id: "career", name: "Career", archivedAt: null },
      { id: "learn", name: "Learning", archivedAt: null },
      { id: "code", name: "Coding", archivedAt: null },
    ]);

    const renderedIds = groups.flatMap((group) =>
      group.items.map((item) => item.id),
    );
    assert.deepEqual(renderedIds, ["shared"]);
  });
});

