import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activeElapsedSecondsFromSession,
  countdownProgressRatio,
  displaySecondsForTimerMode,
  isCountdownComplete,
  remainingSecondsFromCountdown,
} from "@/lib/activity-timer/countdown";
import { DEFAULT_ACTIVITY_TIMER_PRESETS } from "@/lib/activity-timer/constants";
import { formatCountdownPresetDurationLabel } from "@/lib/activity-timer/format";

describe("activity timer countdown timestamps", () => {
  const startedAt = new Date("2026-07-08T12:00:00.000Z");

  it("tracks active elapsed from startedAt using wall clock time", () => {
    const nowMs = new Date("2026-07-08T12:00:40.000Z").getTime();

    assert.equal(
      activeElapsedSecondsFromSession({ startedAt, nowMs }),
      40,
    );
  });

  it("excludes accumulated and current pause time from active elapsed", () => {
    const pausedAt = new Date("2026-07-08T12:00:10.000Z");
    const nowMs = new Date("2026-07-08T12:00:25.000Z").getTime();

    assert.equal(
      activeElapsedSecondsFromSession({
        startedAt,
        pausedAt,
        accumulatedPausedSeconds: 0,
        nowMs,
      }),
      10,
    );
  });

  it("adds prior pause segments through accumulatedPausedSeconds", () => {
    const nowMs = new Date("2026-07-08T12:00:30.000Z").getTime();

    assert.equal(
      activeElapsedSecondsFromSession({
        startedAt,
        accumulatedPausedSeconds: 10,
        nowMs,
      }),
      20,
    );
  });

  it("counts down remaining time and completes at zero", () => {
    const elapsed = 39;

    assert.equal(remainingSecondsFromCountdown(40, elapsed), 1);
    assert.equal(displaySecondsForTimerMode("countDown", elapsed, 40), 1);
    assert.equal(isCountdownComplete("countDown", 40, 39), false);
    assert.equal(isCountdownComplete("countDown", 40, 40), true);
  });

  it("continues count-up mode unchanged", () => {
    assert.equal(displaySecondsForTimerMode("countUp", 90, 40), 90);
    assert.equal(isCountdownComplete("countUp", 40, 90), false);
  });

  it("derives countdown progress for the ring", () => {
    assert.equal(countdownProgressRatio(40, 10), 0.25);
    assert.equal(countdownProgressRatio(40, 40), 1);
  });

  it("simulates background return without losing elapsed time", () => {
    const backgroundNowMs = new Date("2026-07-08T12:00:20.000Z").getTime();
    const foregroundNowMs = new Date("2026-07-08T12:00:35.000Z").getTime();

    assert.equal(
      activeElapsedSecondsFromSession({ startedAt, nowMs: backgroundNowMs }),
      20,
    );
    assert.equal(
      activeElapsedSecondsFromSession({ startedAt, nowMs: foregroundNowMs }),
      35,
    );
    assert.equal(
      remainingSecondsFromCountdown(
        40,
        activeElapsedSecondsFromSession({ startedAt, nowMs: foregroundNowMs }),
      ),
      5,
    );
  });
});

describe("tongue extension default preset", () => {
  it("is a 40-second countdown preset with a monochrome smile icon", () => {
    const preset = DEFAULT_ACTIVITY_TIMER_PRESETS.find(
      (entry) => entry.title === "Tongue extension",
    );

    assert.ok(preset);
    assert.equal(preset.timerMode, "countDown");
    assert.equal(preset.targetDurationSeconds, 40);
    assert.equal(preset.category, "Nervous system");
    assert.equal(preset.iconName, "smile");
    assert.equal(formatCountdownPresetDurationLabel(40), "40 sec");
  });
});
