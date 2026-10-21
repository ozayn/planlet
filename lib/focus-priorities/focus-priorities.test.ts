import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodayDateString } from "@/lib/dates";
import { decideAutoAddPlacement } from "@/lib/focus-priorities/auto-add";
import {
  CANONICAL_FOCUS_PRIORITY_SEEDS,
  LEGACY_FOCUS_PRIORITY_DEFAULTS,
  MAX_FOCUS_PRIORITIES_PER_USER,
  defaultSuggestedTaskTitle,
  isExactLegacyFocusPriorityDefault,
  planFocusPriorityConsolidation,
} from "@/lib/focus-priorities/constants";
import { groupFocusPrioritiesByLifeArea } from "@/lib/focus-priorities/group";
import {
  assertFocusPrioritiesAdminAccess,
  FocusPriorityAuthError,
} from "@/lib/focus-priorities";
import type { SerializedFocusPriority } from "@/lib/focus-priorities/types";

function priority(
  overrides: Partial<SerializedFocusPriority> &
    Pick<SerializedFocusPriority, "id" | "lifeAreaId" | "title">,
): SerializedFocusPriority {
  return {
    lifeAreaName: "Learning & Growth",
    description: null,
    suggestedTaskTitle: defaultSuggestedTaskTitle(overrides.title),
    defaultDurationMinutes: 30,
    subtopics: [],
    autoAddToDailyPlan: false,
    programWindowMonths: null,
    programStartsOn: null,
    programEndsOn: null,
    sortOrder: 0,
    archivedAt: null,
    ...overrides,
  };
}

describe("focus priorities helpers", () => {
  it("allows only ADMIN access", () => {
    assert.doesNotThrow(() => assertFocusPrioritiesAdminAccess("ADMIN"));
    assert.throws(
      () => assertFocusPrioritiesAdminAccess("USER"),
      FocusPriorityAuthError,
    );
    assert.throws(
      () => assertFocusPrioritiesAdminAccess("REFLECTOR"),
      FocusPriorityAuthError,
    );
    assert.throws(
      () => assertFocusPrioritiesAdminAccess(null),
      FocusPriorityAuthError,
    );
  });

  it("defines seven active canonical priorities including PT and BetterMe", () => {
    const active = CANONICAL_FOCUS_PRIORITY_SEEDS.filter((seed) => !seed.archived);
    const archived = CANONICAL_FOCUS_PRIORITY_SEEDS.filter((seed) => seed.archived);

    assert.equal(active.length, 7);
    assert.deepEqual(
      active.map((seed) => seed.title),
      [
        "Applications",
        "Networking & Follow-ups",
        "Technical Practice",
        "Interview Stories & Mock Practice",
        "Shoulder physical therapy",
        "Foot physical therapy",
        "BetterMe Calisthenics",
      ],
    );
    assert.deepEqual(
      archived.map((seed) => seed.title),
      ["Portfolio Polish"],
    );

    const technical = active.find((seed) => seed.title === "Technical Practice");
    assert.ok(technical);
    assert.deepEqual(technical.subtopics, [
      "SQL",
      "Python",
      "Statistics & Experimentation",
      "Machine Learning",
      "Analytical Case Studies",
    ]);
    assert.equal(technical.defaultDurationMinutes, 35);
    assert.equal(
      technical.suggestedTaskTitle,
      "Practice SQL for 35 minutes and review mistakes.",
    );
    assert.equal(technical.autoAddToDailyPlan, false);

    const shoulder = active.find(
      (seed) => seed.title === "Shoulder physical therapy",
    );
    const foot = active.find((seed) => seed.title === "Foot physical therapy");
    assert.ok(shoulder);
    assert.ok(foot);
    assert.equal(shoulder.lifeAreaName, "Health & Wellbeing");
    assert.equal(foot.lifeAreaName, "Health & Wellbeing");
    assert.equal(
      shoulder.suggestedTaskTitle,
      "Do shoulder physical therapy exercises",
    );
    assert.equal(foot.suggestedTaskTitle, "Do foot physical therapy exercises");
    assert.equal(shoulder.autoAddToDailyPlan, true);
    assert.equal(foot.autoAddToDailyPlan, true);
    assert.equal(shoulder.programWindowMonths, null);
    assert.equal(foot.programWindowMonths, null);

    const betterMe = active.find(
      (seed) => seed.title === "BetterMe Calisthenics",
    );
    assert.ok(betterMe);
    assert.equal(betterMe.lifeAreaName, "Health & Wellbeing");
    assert.equal(betterMe.autoAddToDailyPlan, true);
    assert.equal(betterMe.programWindowMonths, 3);
    assert.equal(
      betterMe.description,
      "Follow my three-month BetterMe calisthenics program.",
    );
    assert.equal(
      betterMe.suggestedTaskTitle,
      "Complete today's BetterMe calisthenics workout.",
    );
    assert.doesNotMatch(betterMe.description ?? "", /Sahar/i);
    assert.doesNotMatch(betterMe.suggestedTaskTitle, /Sahar/i);

    assert.ok(
      active
        .filter(
          (seed) =>
            seed.title !== "Shoulder physical therapy" &&
            seed.title !== "Foot physical therapy" &&
            seed.title !== "BetterMe Calisthenics",
        )
        .every((seed) => seed.autoAddToDailyPlan === false),
    );
    assert.ok(MAX_FOCUS_PRIORITIES_PER_USER >= 8);
  });

  it("consolidates exact legacy defaults without touching customized rows", () => {
    const legacy = LEGACY_FOCUS_PRIORITY_DEFAULTS.map((entry, index) => ({
      id: `legacy-${index}`,
      title: entry.title,
      suggestedTaskTitle: entry.suggestedTaskTitle,
    }));
    const customizedLegacyTitle = {
      id: "custom-sql",
      title: "SQL",
      suggestedTaskTitle: "Deep SQL review for interviews",
    };
    const custom = {
      id: "custom-1",
      title: "My own priority",
      suggestedTaskTitle: "Do the thing",
    };
    const existingCanonical = {
      id: "apps",
      title: "Applications",
      suggestedTaskTitle: "Tailor and submit one relevant application.",
    };

    const plan = planFocusPriorityConsolidation([
      ...legacy,
      customizedLegacyTitle,
      custom,
      existingCanonical,
    ]);

    assert.equal(plan.deleteIds.length, LEGACY_FOCUS_PRIORITY_DEFAULTS.length);
    assert.ok(plan.deleteIds.every((id) => id.startsWith("legacy-")));
    assert.ok(plan.ambiguous.some((entry) => entry.id === "custom-sql"));
    assert.ok(!plan.createSeeds.some((seed) => seed.title === "Applications"));
    assert.ok(
      plan.createSeeds.some((seed) => seed.title === "Technical Practice"),
    );
    assert.ok(
      plan.createSeeds.some((seed) => seed.title === "Portfolio Polish"),
    );
    assert.deepEqual(plan.syncIds, ["apps"]);
    assert.ok(!plan.deleteIds.includes("custom-1"));
    assert.ok(!plan.deleteIds.includes("custom-sql"));
  });

  it("is idempotent when only canonical priorities remain", () => {
    const existing = CANONICAL_FOCUS_PRIORITY_SEEDS.map((seed, index) => ({
      id: `canon-${index}`,
      title: seed.title,
      suggestedTaskTitle: seed.suggestedTaskTitle,
    }));
    const plan = planFocusPriorityConsolidation(existing);
    assert.deepEqual(plan.deleteIds, []);
    assert.deepEqual(plan.createSeeds, []);
    assert.equal(plan.syncIds.length, CANONICAL_FOCUS_PRIORITY_SEEDS.length);
    assert.deepEqual(plan.ambiguous, []);
  });

  it("syncs BetterMe when the suggested task is the prior Sahar default", () => {
    const betterMe = CANONICAL_FOCUS_PRIORITY_SEEDS.find(
      (seed) => seed.title === "BetterMe Calisthenics",
    );
    assert.ok(betterMe);
    const existing = [
      {
        id: "bm",
        title: "BetterMe Calisthenics",
        suggestedTaskTitle: "Do BetterMe calisthenics with Sahar",
      },
    ];
    const plan = planFocusPriorityConsolidation(existing);
    assert.deepEqual(plan.syncIds, ["bm"]);
    assert.doesNotMatch(betterMe.suggestedTaskTitle, /Sahar/i);
  });

  it("recognizes exact legacy defaults only", () => {
    assert.equal(
      isExactLegacyFocusPriorityDefault({
        title: "SQL",
        suggestedTaskTitle: "Practice SQL — 30 minutes",
      }),
      true,
    );
    assert.equal(
      isExactLegacyFocusPriorityDefault({
        title: "SQL",
        suggestedTaskTitle: "Practice SQL for interviews",
      }),
      false,
    );
  });

  it("groups active priorities by Life Area and skips archived ones", () => {
    const grouped = groupFocusPrioritiesByLifeArea([
      priority({
        id: "1",
        lifeAreaId: "career",
        title: "Applications",
        lifeAreaName: "Career & Professional Life",
      }),
      priority({
        id: "2",
        lifeAreaId: "learn",
        title: "Technical Practice",
        subtopics: ["SQL", "Python"],
      }),
      priority({
        id: "3",
        lifeAreaId: "projects",
        title: "Portfolio Polish",
        lifeAreaName: "Projects & Creativity",
        archivedAt: "2026-10-19T00:00:00.000Z",
      }),
    ]);

    assert.deepEqual(
      grouped.get("career")?.map((entry) => entry.title),
      ["Applications"],
    );
    assert.deepEqual(
      grouped.get("learn")?.map((entry) => entry.title),
      ["Technical Practice"],
    );
    assert.equal(grouped.has("projects"), false);
  });

  it("keeps task history independent from priority edits conceptually", () => {
    const before = priority({
      id: "p1",
      lifeAreaId: "learn",
      title: "Technical Practice",
      suggestedTaskTitle: "Practice SQL for 35 minutes and review mistakes.",
    });
    const afterRename = {
      ...before,
      suggestedTaskTitle: "Practice Python for 35 minutes and review mistakes.",
    };
    const createdTaskTitle = before.suggestedTaskTitle;

    assert.notEqual(afterRename.suggestedTaskTitle, createdTaskTitle);
    assert.equal(
      createdTaskTitle,
      "Practice SQL for 35 minutes and review mistakes.",
    );
  });

  it("resolves today with the user timezone calendar date, not UTC day", () => {
    // 2026-10-20 02:30 UTC is still 2026-10-19 in America/New_York.
    const nearMidnightUtc = new Date("2026-10-20T02:30:00.000Z");
    assert.equal(
      getTodayDateString("America/New_York", nearMidnightUtc),
      "2026-10-19",
    );
    assert.equal(
      getTodayDateString("UTC", nearMidnightUtc),
      "2026-10-20",
    );
  });

  it("skips auto-add when a placement already exists for the day", () => {
    assert.deepEqual(
      decideAutoAddPlacement({
        hasPlacementForDay: true,
        dayDate: "2026-10-21",
      }),
      { action: "skip", reason: "already_placed" },
    );
    assert.deepEqual(
      decideAutoAddPlacement({
        hasPlacementForDay: false,
        dayDate: "2026-10-21",
      }),
      { action: "create" },
    );
  });
});
