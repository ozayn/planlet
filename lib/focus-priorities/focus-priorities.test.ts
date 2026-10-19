import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

  it("defines exactly four active canonical priorities and archived Portfolio Polish", () => {
    const active = CANONICAL_FOCUS_PRIORITY_SEEDS.filter((seed) => !seed.archived);
    const archived = CANONICAL_FOCUS_PRIORITY_SEEDS.filter((seed) => seed.archived);

    assert.equal(active.length, 4);
    assert.deepEqual(
      active.map((seed) => seed.title),
      [
        "Applications",
        "Networking & Follow-ups",
        "Technical Practice",
        "Interview Stories & Mock Practice",
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
    assert.ok(MAX_FOCUS_PRIORITIES_PER_USER >= 5);
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
});
