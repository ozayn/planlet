import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SerializedPlan, SerializedPlanItem } from "@/lib/plan-serialize";

import {
  generateShareText,
  serializedPlanToSharePlan,
} from "@/lib/share-plan";

function item(
  id: string,
  status: SerializedPlanItem["status"],
  sortOrder: number,
  completedAt: string | null = null,
  subtasks: SerializedPlanItem[] = [],
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
    subtasks,
  };
}

function planWithItems(items: SerializedPlanItem[]): SerializedPlan {
  return {
    id: "plan-1",
    title: "Tuesday",
    type: "DAY",
    dateStart: "2026-06-09T07:00:00.000Z",
    dateEnd: "2026-06-10T06:59:59.999Z",
    language: "EN",
    summary: null,
    updatedAt: "2026-06-09T12:00:00.000Z",
    items,
  };
}

function taskTitlesFromPlainShare(plan: SerializedPlan): string[] {
  const text = generateShareText(serializedPlanToSharePlan(plan), {
    format: "PLAIN_TEXT",
    mode: "PLAN",
  });

  const tasksIndex = text.indexOf("Tasks:");
  assert.notEqual(tasksIndex, -1);

  const afterTasks = text.slice(tasksIndex + "Tasks:".length).trim();
  const sectionBody = afterTasks.split("\n\n")[0] ?? "";

  return sectionBody
    .split("\n")
    .map((line) => line.replace(/^- /, "").replace(/^\[[^\]]+\] /, "").trim())
    .filter(Boolean);
}

describe("serializedPlanToSharePlan", () => {
  it("orders root items like the UI before export", () => {
    const plan = planWithItems([
      item("A", "OPEN", 0),
      item("B", "DONE", 100, "2026-01-01T00:00:00.000Z"),
      item("C", "OPEN", 200),
      item("D", "DONE", 300, "2026-01-02T00:00:00.000Z"),
    ]);

    assert.deepEqual(
      serializedPlanToSharePlan(plan).items.map((entry) => entry.title),
      ["B", "D", "A", "C"],
    );
  });

  it("keeps subtasks nested under a completed parent block", () => {
    const plan = planWithItems([
      item("A", "OPEN", 0),
      item(
        "Set up Jibble",
        "DONE",
        100,
        "2026-01-01T00:00:00.000Z",
        [
          item("Invite team", "DONE", 0, "2026-01-01T00:00:00.000Z"),
          item("Configure reminders", "DONE", 1, "2026-01-01T00:00:00.000Z"),
        ],
      ),
    ]);

    const [first, second] = serializedPlanToSharePlan(plan).items;

    assert.equal(first.title, "Set up Jibble");
    assert.deepEqual(
      first.subtasks?.map((subtask) => subtask.title),
      ["Invite team", "Configure reminders"],
    );
    assert.equal(second.title, "A");
  });

  it("respects moveCompletedToTop = false", () => {
    const plan = planWithItems([
      item("A", "OPEN", 0),
      item("B", "DONE", 100, "2026-01-01T00:00:00.000Z"),
      item("C", "OPEN", 200),
    ]);

    assert.deepEqual(
      serializedPlanToSharePlan(plan, { moveCompletedToTop: false }).items.map(
        (entry) => entry.title,
      ),
      ["A", "B", "C"],
    );
  });
});

describe("generateShareText", () => {
  it("copies tasks in visible UI order", () => {
    const plan = planWithItems([
      item("Set up jibble", "DONE", 100, "2026-01-01T00:00:00.000Z"),
      item("Psychiatrist appointment", "DONE", 200, "2026-01-02T00:00:00.000Z"),
      item("Work on expoprint", "OPEN", 300),
      item("Meeting Josh", "OPEN", 400),
    ]);

    assert.deepEqual(taskTitlesFromPlainShare(plan), [
      "Set up jibble",
      "Psychiatrist appointment",
      "Work on expoprint",
      "Meeting Josh",
    ]);
  });
});
