import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SerializedPlan, SerializedPlanItem } from "@/lib/plan-serialize";

import {
  generateShareText,
  groupShareItemsByPrimaryLifeArea,
  serializedPlanToSharePlan,
  shareUiFormatToOptions,
} from "@/lib/share-plan";

function item(
  id: string,
  status: SerializedPlanItem["status"],
  sortOrder: number,
  completedAt: string | null = null,
  subtasks: SerializedPlanItem[] = [],
  extras: Partial<SerializedPlanItem> = {},
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
    lifeAreas: [],
    commentCount: 0,
    subtasks,
    ...extras,
  };
}

function planWithItems(
  items: SerializedPlanItem[],
  type: SerializedPlan["type"] = "DAY",
): SerializedPlan {
  return {
    id: "plan-1",
    title: "Tuesday",
    type,
    dateStart: "2026-10-20T04:00:00.000Z",
    dateEnd: "2026-10-21T03:59:59.999Z",
    language: "EN",
    summary: null,
    updatedAt: "2026-10-20T12:00:00.000Z",
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

const AREA_ORDER = [
  { id: "career", name: "Career & Job Search", archivedAt: null },
  { id: "learn", name: "Learning & Development", archivedAt: null },
  { id: "health", name: "Health & Wellbeing", archivedAt: null },
];

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

  it("maps primary Life Area onto share items", () => {
    const plan = planWithItems([
      item("Outreach", "OPEN", 0, null, [], {
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
          {
            id: "learn",
            name: "Learning & Development",
            isPrimary: false,
            archived: false,
          },
        ],
      }),
    ]);

    const [first] = serializedPlanToSharePlan(plan).items;
    assert.equal(first.primaryLifeAreaId, "career");
    assert.equal(first.primaryLifeAreaName, "Career & Job Search");
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

  it("keeps pretty, simple, and progress formats unchanged without life area headings", () => {
    const plan = planWithItems([
      item("Outreach", "OPEN", 0, null, [], {
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
      item("Groceries", "OPEN", 100),
    ]);

    const pretty = generateShareText(serializedPlanToSharePlan(plan), {
      format: "TELEGRAM",
      mode: "PLAN",
    });
    const plain = generateShareText(serializedPlanToSharePlan(plan), {
      format: "PLAIN_TEXT",
      mode: "PLAN",
    });
    const update = generateShareText(
      serializedPlanToSharePlan(
        planWithItems([item("Outreach", "DONE", 0, "2026-10-20T12:00:00.000Z")]),
      ),
      { format: "SUMMARY", mode: "UPDATE" },
    );

    assert.match(pretty, /Tasks/);
    assert.doesNotMatch(pretty, /Career & Job Search/);
    assert.match(plain, /Tasks:/);
    assert.doesNotMatch(plain, /Uncategorized/);
    assert.match(update, /Done:/);
    assert.doesNotMatch(update, /Life Area/);
  });
});

describe("By Life Area share format", () => {
  it("groups tasks by primary area, hides empty areas, and respects catalog order", () => {
    const plan = planWithItems([
      item("Buy groceries", "OPEN", 0),
      item("LinkedIn outreach", "OPEN", 100, null, [], {
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
      item("Physical therapy", "OPEN", 200, null, [], {
        lifeAreas: [
          {
            id: "health",
            name: "Health & Wellbeing",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
      item("Review ML concepts", "OPEN", 300, null, [], {
        lifeAreas: [
          {
            id: "learn",
            name: "Learning & Development",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
      item("Apply for a position", "OPEN", 400, null, [], {
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
    ]);

    const text = generateShareText(
      serializedPlanToSharePlan(plan, { moveCompletedToTop: false }),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );

    assert.match(text, /Career & Job Search/);
    assert.match(text, /Learning & Development/);
    assert.match(text, /Health & Wellbeing/);
    assert.match(text, /Uncategorized/);
    assert.doesNotMatch(text, /Coding & Projects/);
    assert.doesNotMatch(text, /Tasks/);

    const careerIndex = text.indexOf("Career & Job Search");
    const learnIndex = text.indexOf("Learning & Development");
    const healthIndex = text.indexOf("Health & Wellbeing");
    const uncategorizedIndex = text.indexOf("Uncategorized");
    assert.ok(careerIndex < learnIndex);
    assert.ok(learnIndex < healthIndex);
    assert.ok(healthIndex < uncategorizedIndex);

    const careerBlock = text.slice(careerIndex, learnIndex);
    assert.match(careerBlock, /☐ LinkedIn outreach/);
    assert.match(careerBlock, /☐ Apply for a position/);
    assert.ok(
      careerBlock.indexOf("LinkedIn outreach") <
        careerBlock.indexOf("Apply for a position"),
    );
  });

  it("does not duplicate tasks under secondary Life Areas", () => {
    const plan = planWithItems([
      item("Shared task", "OPEN", 0, null, [], {
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
          {
            id: "learn",
            name: "Learning & Development",
            isPrimary: false,
            archived: false,
          },
        ],
      }),
    ]);

    const sharePlan = serializedPlanToSharePlan(plan);
    const groups = groupShareItemsByPrimaryLifeArea(sharePlan.items, AREA_ORDER);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.areaId, "career");
    assert.deepEqual(
      groups[0]?.items.map((entry) => entry.title),
      ["Shared task"],
    );

    const text = generateShareText(
      sharePlan,
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );
    assert.equal((text.match(/Shared task/g) ?? []).length, 1);
    assert.doesNotMatch(text, /Learning & Development/);
  });

  it("puts uncategorized tasks under Uncategorized only when needed", () => {
    const onlyUncategorized = generateShareText(
      serializedPlanToSharePlan(planWithItems([item("Solo", "OPEN", 0)])),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );
    assert.match(onlyUncategorized, /Uncategorized/);
    assert.match(onlyUncategorized, /☐ Solo/);
    assert.doesNotMatch(onlyUncategorized, /Career & Job Search/);

    const onlyCategorized = generateShareText(
      serializedPlanToSharePlan(
        planWithItems([
          item("Job", "OPEN", 0, null, [], {
            lifeAreas: [
              {
                id: "career",
                name: "Career & Job Search",
                isPrimary: true,
                archived: false,
              },
            ],
          }),
        ]),
      ),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );
    assert.match(onlyCategorized, /Career & Job Search/);
    assert.doesNotMatch(onlyCategorized, /Uncategorized/);
  });

  it("excludes private tasks and private subtasks", () => {
    const plan = planWithItems([
      item("Public", "OPEN", 0, null, [], {
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
      item("Secret root", "OPEN", 100, null, [], {
        shareable: false,
        lifeAreas: [
          {
            id: "career",
            name: "Career & Job Search",
            isPrimary: true,
            archived: false,
          },
        ],
      }),
      item(
        "Parent",
        "OPEN",
        200,
        null,
        [
          item("Public sub", "OPEN", 0),
          item("Private sub", "OPEN", 1, null, [], { shareable: false }),
        ],
        {
          lifeAreas: [
            {
              id: "health",
              name: "Health & Wellbeing",
              isPrimary: true,
              archived: false,
            },
          ],
        },
      ),
    ]);

    const text = generateShareText(
      serializedPlanToSharePlan(plan, { moveCompletedToTop: false }),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );

    assert.match(text, /☐ Public\n/);
    assert.doesNotMatch(text, /Secret root/);
    assert.match(text, /☐ Parent/);
    assert.match(text, /Public sub/);
    assert.doesNotMatch(text, /Private sub/);
  });

  it("keeps subtasks nested under their parent and preserves status icons", () => {
    const plan = planWithItems([
      item(
        "Ship feature",
        "PARTIAL",
        0,
        null,
        [
          item("Write tests", "DONE", 0, "2026-10-20T12:00:00.000Z"),
          item("Open PR", "OPEN", 1),
        ],
        {
          lifeAreas: [
            {
              id: "learn",
              name: "Learning & Development",
              isPrimary: true,
              archived: false,
            },
          ],
        },
      ),
    ]);

    const text = generateShareText(
      serializedPlanToSharePlan(plan),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );

    assert.match(text, /Learning & Development\n◐ Ship feature\n {2}✅ Write tests\n {2}☐ Open PR/);
  });

  it("supports week, month, and year plan headers", () => {
    const week = generateShareText(
      serializedPlanToSharePlan({
        ...planWithItems([item("A", "OPEN", 0)]),
        type: "WEEK",
        title: "Week of Oct 19",
        dateStart: "2026-10-19T04:00:00.000Z",
        dateEnd: "2026-10-26T03:59:59.999Z",
      }),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );
    const month = generateShareText(
      serializedPlanToSharePlan({
        ...planWithItems([item("A", "OPEN", 0)]),
        type: "MONTH",
        title: "October 2026",
        dateStart: "2026-10-01T04:00:00.000Z",
        dateEnd: "2026-11-01T03:59:59.999Z",
      }),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );
    const year = generateShareText(
      serializedPlanToSharePlan({
        ...planWithItems([item("A", "OPEN", 0)]),
        type: "YEAR",
        title: "2026",
        dateStart: "2026-01-01T05:00:00.000Z",
        dateEnd: "2027-01-01T04:59:59.999Z",
      }),
      shareUiFormatToOptions("lifeAreas", AREA_ORDER),
    );

    assert.match(week, /Uncategorized/);
    assert.match(month, /Uncategorized/);
    assert.match(year, /Uncategorized/);
    assert.notEqual(week.split("\n")[0], "");
    assert.notEqual(month.split("\n")[0], "");
    assert.notEqual(year.split("\n")[0], "");
  });

  it("maps UI format options so preview text matches export options", () => {
    const options = shareUiFormatToOptions("lifeAreas", AREA_ORDER);
    assert.equal(options.format, "LIFE_AREAS");
    assert.equal(options.mode, "PLAN");
    assert.deepEqual(options.lifeAreaOrder, AREA_ORDER);

    const plan = planWithItems([item("Solo", "OPEN", 0)]);
    const sharePlan = serializedPlanToSharePlan(plan);
    const preview = generateShareText(sharePlan, options);
    const copied = generateShareText(sharePlan, {
      format: "LIFE_AREAS",
      mode: "PLAN",
      lifeAreaOrder: AREA_ORDER,
    });
    assert.equal(preview, copied);
  });
});
