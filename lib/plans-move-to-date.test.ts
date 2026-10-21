import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  associationsFromLifeAreaLinks,
  toCopyablePlanItemFields,
} from "@/lib/plans";

describe("movePlanItemToDate copy field preservation", () => {
  it("maps primary and secondary Life Area links without duplicates", () => {
    assert.deepEqual(
      associationsFromLifeAreaLinks([
        { lifeAreaId: "health", isPrimary: true },
        { lifeAreaId: "career", isPrimary: false },
        { lifeAreaId: "health", isPrimary: false },
        { lifeAreaId: "career", isPrimary: false },
      ]),
      {
        primaryLifeAreaId: "health",
        secondaryLifeAreaIds: ["career"],
      },
    );
  });

  it("keeps uncategorized tasks uncategorized", () => {
    assert.deepEqual(associationsFromLifeAreaLinks([]), {
      primaryLifeAreaId: null,
      secondaryLifeAreaIds: [],
    });
  });

  it("copies theme, project, duration, and Life Areas into move fields", () => {
    const fields = toCopyablePlanItemFields({
      title: "Do shoulder physical therapy exercises",
      description: "As prescribed",
      type: "TASK",
      importance: "HIGH",
      urgency: null,
      timeHint: null,
      startTime: null,
      endTime: null,
      durationMinutes: 20,
      comment: "Note from yesterday",
      shareable: true,
      sortOrder: 100,
      themeId: "theme-1",
      projectId: "project-1",
      satisfactionLevel: null,
      confidenceLevel: null,
      excitementLevel: null,
      lifeAreaLinks: [
        { lifeAreaId: "health", isPrimary: true },
        { lifeAreaId: "home", isPrimary: false },
      ],
    });

    assert.equal(fields.title, "Do shoulder physical therapy exercises");
    assert.equal(fields.description, "As prescribed");
    assert.equal(fields.durationMinutes, 20);
    assert.equal(fields.comment, "Note from yesterday");
    assert.equal(fields.themeId, "theme-1");
    assert.equal(fields.projectId, "project-1");
    assert.equal(fields.primaryLifeAreaId, "health");
    assert.deepEqual(fields.secondaryLifeAreaIds, ["home"]);
    assert.equal(fields.importance, "HIGH");
  });

  it("preserves null associations when the source task has none", () => {
    const fields = toCopyablePlanItemFields({
      title: "Uncategorized chore",
      description: null,
      type: "TASK",
      importance: null,
      urgency: null,
      timeHint: null,
      startTime: null,
      endTime: null,
      durationMinutes: null,
      comment: null,
      shareable: true,
      sortOrder: 0,
    });

    assert.equal(fields.themeId, null);
    assert.equal(fields.projectId, null);
    assert.equal(fields.primaryLifeAreaId, null);
    assert.deepEqual(fields.secondaryLifeAreaIds, []);
  });
});
