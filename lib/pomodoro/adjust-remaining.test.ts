import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_POMODORO_DURATION_SECONDS } from "@/lib/pomodoro/constants";
import { computeAdjustedPomodoroTarget } from "@/lib/pomodoro/adjust-remaining";

describe("computeAdjustedPomodoroTarget", () => {
  it("adds five minutes to remaining time without changing elapsed", () => {
    const result = computeAdjustedPomodoroTarget({
      activeElapsedSeconds: 10 * 60,
      currentTargetDurationSeconds: 25 * 60,
      deltaSeconds: 5 * 60,
    });

    // Remaining was 15; after +5 → 20. Target = 10 + 20.
    assert.equal(result.remainingSeconds, 20 * 60);
    assert.equal(result.targetDurationSeconds, 30 * 60);
    assert.equal(result.requiresExplicitFinish, false);
  });

  it("subtracts five minutes and clamps at zero remaining", () => {
    const result = computeAdjustedPomodoroTarget({
      activeElapsedSeconds: 22 * 60,
      currentTargetDurationSeconds: 25 * 60,
      deltaSeconds: -5 * 60,
    });

    assert.equal(result.remainingSeconds, 0);
    assert.equal(result.targetDurationSeconds, 22 * 60);
    assert.equal(result.requiresExplicitFinish, true);
  });

  it("sets a custom remaining duration", () => {
    const result = computeAdjustedPomodoroTarget({
      activeElapsedSeconds: 5 * 60,
      currentTargetDurationSeconds: 25 * 60,
      remainingSeconds: 20 * 60,
    });

    assert.equal(result.remainingSeconds, 20 * 60);
    assert.equal(result.targetDurationSeconds, 25 * 60);
    assert.equal(result.requiresExplicitFinish, false);
  });

  it("clamps the total target to the max Pomodoro duration", () => {
    const result = computeAdjustedPomodoroTarget({
      activeElapsedSeconds: MAX_POMODORO_DURATION_SECONDS - 60,
      currentTargetDurationSeconds: MAX_POMODORO_DURATION_SECONDS,
      deltaSeconds: 10 * 60,
    });

    assert.equal(result.targetDurationSeconds, MAX_POMODORO_DURATION_SECONDS);
    assert.equal(result.remainingSeconds, 60);
  });

  it("rejects missing or dual adjustment modes", () => {
    assert.throws(() =>
      computeAdjustedPomodoroTarget({
        activeElapsedSeconds: 0,
        currentTargetDurationSeconds: 1500,
      }),
    );
    assert.throws(() =>
      computeAdjustedPomodoroTarget({
        activeElapsedSeconds: 0,
        currentTargetDurationSeconds: 1500,
        remainingSeconds: 600,
        deltaSeconds: 300,
      }),
    );
  });
});
