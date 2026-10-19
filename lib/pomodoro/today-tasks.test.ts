import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PomodoroTaskOption } from "@/lib/pomodoro/constants";
import {
  isIncompletePomodoroTaskStatus,
  partitionPomodoroTaskOptions,
} from "@/lib/pomodoro/today-task-options";

describe("pomodoro today task helpers", () => {
  it("treats open/partial/not-done as incomplete", () => {
    assert.equal(isIncompletePomodoroTaskStatus("OPEN"), true);
    assert.equal(isIncompletePomodoroTaskStatus("PARTIAL"), true);
    assert.equal(isIncompletePomodoroTaskStatus("NOT_DONE"), true);
    assert.equal(isIncompletePomodoroTaskStatus("DONE"), false);
    assert.equal(isIncompletePomodoroTaskStatus("SKIPPED"), false);
  });

  it("partitions incomplete tasks first for the selector", () => {
    const tasks: PomodoroTaskOption[] = [
      { id: "1", title: "Done item", completed: true },
      { id: "2", title: "Open item", completed: false },
      { id: "3", title: "Also done", completed: true },
      { id: "4", title: "Partial", completed: false },
    ];

    const { incomplete, completed } = partitionPomodoroTaskOptions(tasks);
    assert.deepEqual(
      incomplete.map((task) => task.id),
      ["2", "4"],
    );
    assert.deepEqual(
      completed.map((task) => task.id),
      ["1", "3"],
    );
  });
});
