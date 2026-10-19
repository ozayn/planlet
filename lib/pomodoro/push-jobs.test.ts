import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPomodoroPushPayload,
  computePomodoroPushSendAt,
} from "@/lib/pomodoro/push-jobs";
import { POMODORO_OPEN_PATH } from "@/lib/pomodoro/constants";

describe("pomodoro push job scheduling math", () => {
  it("schedules sendAt from remaining countdown seconds", () => {
    const startedAt = "2026-10-19T15:00:00.000Z";
    const nowMs = Date.parse("2026-10-19T15:10:00.000Z");
    const sendAt = computePomodoroPushSendAt({
      startedAt,
      targetDurationSeconds: 25 * 60,
      accumulatedPausedSeconds: 0,
      nowMs,
    });

    // 15 minutes remaining → 15:25:00Z
    assert.equal(sendAt.toISOString(), "2026-10-19T15:25:00.000Z");
  });

  it("excludes pause time when computing remaining", () => {
    const startedAt = "2026-10-19T15:00:00.000Z";
    const nowMs = Date.parse("2026-10-19T15:12:00.000Z");
    const sendAt = computePomodoroPushSendAt({
      startedAt,
      pausedAt: "2026-10-19T15:10:00.000Z",
      targetDurationSeconds: 25 * 60,
      accumulatedPausedSeconds: 0,
      nowMs,
    });

    // Elapsed active = 10 minutes while paused at 15:10; remaining 15 minutes
    // from the freeze point → sendAt stays 15:25 relative to active elapsed.
    assert.equal(sendAt.toISOString(), "2026-10-19T15:27:00.000Z");
  });

  it("builds generic payloads without task titles", () => {
    const focus = buildPomodoroPushPayload("focus", "token-abc");
    assert.equal(focus.title, "Focus complete");
    assert.equal(focus.body, "Time for a short break.");
    assert.equal(focus.url, POMODORO_OPEN_PATH);
    assert.equal(focus.kind, "focus-complete");
    assert.equal(focus.tag, "planlet-pomodoro-token-abc");
    assert.doesNotMatch(focus.body, /task|planlet development/i);

    const brk = buildPomodoroPushPayload("short_break");
    assert.equal(brk.kind, "break-complete");
    assert.equal(brk.body, "Ready for another focus session?");
    assert.equal(brk.url, POMODORO_OPEN_PATH);
    assert.equal(brk.tag, "planlet-pomodoro");
  });
});
