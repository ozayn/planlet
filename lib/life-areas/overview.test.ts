import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_LIFE_AREA_NAMES,
  DEFAULT_LIFE_AREA_RENAME_MAP,
  shortLifeAreaLabel,
} from "@/lib/life-areas/constants";
import {
  planDefaultLifeAreaRenames,
  summarizeDailyLifeAreas,
} from "@/lib/life-areas/overview";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

function area(
  id: string,
  name: string,
  sortOrder: number,
): SerializedLifeArea {
  return { id, name, sortOrder, archivedAt: null };
}

function task(
  id: string,
  lifeAreas: SerializedPlanItem["lifeAreas"] = [],
  extras: Partial<SerializedPlanItem> = {},
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
    ...extras,
  };
}

const CATALOG = [
  area("career", "Career & Professional Life", 0),
  area("learn", "Learning & Growth", 1),
  area("projects", "Projects & Creativity", 2),
  area("rel", "Relationships", 3),
  area("health", "Health & Wellbeing", 4),
  area("leisure", "Leisure & Experiences", 5),
  area("home", "Home & Life Admin", 6),
];

describe("default Life Area renames", () => {
  it("maps only the original seeded names to the new permanent names", () => {
    assert.equal(
      DEFAULT_LIFE_AREA_RENAME_MAP["Career & Job Search"],
      "Career & Professional Life",
    );
    assert.equal(
      DEFAULT_LIFE_AREA_RENAME_MAP["Learning & Development"],
      "Learning & Growth",
    );
    assert.equal(
      DEFAULT_LIFE_AREA_RENAME_MAP["Coding & Projects"],
      "Projects & Creativity",
    );
    assert.equal(
      DEFAULT_LIFE_AREA_RENAME_MAP["Arts & Enjoyment"],
      "Leisure & Experiences",
    );
    assert.equal(
      DEFAULT_LIFE_AREA_RENAME_MAP["Home & Personal"],
      "Home & Life Admin",
    );
    assert.deepEqual([...DEFAULT_LIFE_AREA_NAMES], [
      "Career & Professional Life",
      "Learning & Growth",
      "Projects & Creativity",
      "Relationships",
      "Health & Wellbeing",
      "Leisure & Experiences",
      "Home & Life Admin",
    ]);
  });

  it("plans renames for exact legacy defaults and skips customized names", () => {
    assert.deepEqual(
      planDefaultLifeAreaRenames([
        "Career & Job Search",
        "My Custom Area",
        "Learning & Development",
      ]),
      [
        {
          from: "Career & Job Search",
          to: "Career & Professional Life",
        },
        {
          from: "Learning & Development",
          to: "Learning & Growth",
        },
      ],
    );

    assert.deepEqual(
      planDefaultLifeAreaRenames(["My Custom Career Name"]),
      [],
    );
  });

  it("skips a rename when the target name already exists", () => {
    assert.deepEqual(
      planDefaultLifeAreaRenames([
        "Career & Job Search",
        "Career & Professional Life",
      ]),
      [],
    );
  });
});

describe("summarizeDailyLifeAreas", () => {
  it("counts primary areas only and ignores secondaries", () => {
    const summary = summarizeDailyLifeAreas({
      lifeAreas: CATALOG,
      items: [
        task("a", [
          {
            id: "career",
            name: "Career & Professional Life",
            isPrimary: true,
            archived: false,
          },
          {
            id: "learn",
            name: "Learning & Growth",
            isPrimary: false,
            archived: false,
          },
        ]),
        task("b", [
          {
            id: "health",
            name: "Health & Wellbeing",
            isPrimary: true,
            archived: false,
          },
        ]),
        task("c"),
        task("d", [
          {
            id: "career",
            name: "Career & Professional Life",
            isPrimary: true,
            archived: false,
          },
        ]),
      ],
    });

    assert.deepEqual(summary.representedShortLabels, [
      "Career",
      "Health",
    ]);
    assert.equal(summary.representedCount, 2);
    assert.equal(summary.totalActiveAreas, 7);
    assert.equal(
      summary.rows.find((row) => row.id === "career")?.taskCount,
      2,
    );
    assert.equal(
      summary.rows.find((row) => row.id === "learn")?.hasTasks,
      false,
    );
  });

  it("does not treat uncategorized or notes as represented areas", () => {
    const summary = summarizeDailyLifeAreas({
      lifeAreas: CATALOG,
      items: [
        task("solo"),
        task("note", [], { type: "NOTE", title: "note" }),
      ],
    });

    assert.deepEqual(summary.representedShortLabels, []);
    assert.equal(summary.representedCount, 0);
  });

  it("uses short labels for the overview line", () => {
    assert.equal(shortLifeAreaLabel("Leisure & Experiences"), "Leisure");
    assert.equal(shortLifeAreaLabel("Home & Life Admin"), "Home");
  });
});
