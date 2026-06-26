import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveParentStatusFromSubtasks,
  shouldCascadeDoneToSubtasks,
} from "@/lib/parent-task-status";

describe("shouldCascadeDoneToSubtasks", () => {
  it("cascades only when marking a parent with subtasks done", () => {
    assert.equal(shouldCascadeDoneToSubtasks("DONE", 2), true);
    assert.equal(shouldCascadeDoneToSubtasks("DONE", 0), false);
    assert.equal(shouldCascadeDoneToSubtasks("OPEN", 2), false);
  });
});

describe("deriveParentStatusFromSubtasks", () => {
  it("marks the parent done when all subtasks are done", () => {
    assert.equal(
      deriveParentStatusFromSubtasks(["DONE", "DONE"], "PARTIAL"),
      "DONE",
    );
  });

  it("marks the parent partial when a new open subtask is added to a done parent", () => {
    assert.equal(
      deriveParentStatusFromSubtasks(["DONE", "OPEN"], "DONE"),
      "PARTIAL",
    );
  });

  it("marks the parent partial when done and partial subtasks coexist", () => {
    assert.equal(
      deriveParentStatusFromSubtasks(["DONE", "PARTIAL"], "OPEN"),
      "PARTIAL",
    );
  });

  it("does not derive a parent status when there are no subtasks", () => {
    assert.equal(deriveParentStatusFromSubtasks([], "OPEN"), "OPEN");
  });
});
