import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cycleDotsState,
  durationSecondsForPhase,
  nextBreakPhaseAfterFocus,
  nextFocusStateAfterBreak,
  phaseLabel,
} from "@/lib/pomodoro/cycle";
import {
  DEFAULT_POMODORO_PREFERENCES,
  DEFAULT_POMODORO_FOCUS_SECONDS,
  DEFAULT_POMODORO_SHORT_BREAK_SECONDS,
  DEFAULT_POMODORO_LONG_BREAK_SECONDS,
} from "@/lib/pomodoro/constants";
import { normalizePomodoroPreferences } from "@/lib/pomodoro/preferences";
import { shouldSaveTimerSession } from "@/lib/activity-timer/countdown";
import { MIN_POMODORO_FOCUS_LOG_SECONDS } from "@/lib/pomodoro/constants";
import { formatPomodoroFocusedSummary } from "@/lib/pomodoro/format";
import { activeElapsedSecondsFromSession } from "@/lib/activity-timer/countdown";

describe("pomodoro cycle", () => {
  it("uses 25 / 5 / 15 minute defaults", () => {
    assert.equal(DEFAULT_POMODORO_FOCUS_SECONDS, 25 * 60);
    assert.equal(DEFAULT_POMODORO_SHORT_BREAK_SECONDS, 5 * 60);
    assert.equal(DEFAULT_POMODORO_LONG_BREAK_SECONDS, 15 * 60);
    assert.equal(
      durationSecondsForPhase("focus", DEFAULT_POMODORO_PREFERENCES),
      25 * 60,
    );
    assert.equal(
      durationSecondsForPhase("short_break", DEFAULT_POMODORO_PREFERENCES),
      5 * 60,
    );
    assert.equal(
      durationSecondsForPhase("long_break", DEFAULT_POMODORO_PREFERENCES),
      15 * 60,
    );
  });

  it("schedules a long break after four completed focus sessions", () => {
    assert.equal(
      nextBreakPhaseAfterFocus({
        completedFocusCount: 1,
        sessionsBeforeLongBreak: 4,
      }),
      "short_break",
    );
    assert.equal(
      nextBreakPhaseAfterFocus({
        completedFocusCount: 3,
        sessionsBeforeLongBreak: 4,
      }),
      "short_break",
    );
    assert.equal(
      nextBreakPhaseAfterFocus({
        completedFocusCount: 4,
        sessionsBeforeLongBreak: 4,
      }),
      "long_break",
    );
  });

  it("respects custom sessions-before-long-break", () => {
    assert.equal(
      nextBreakPhaseAfterFocus({
        completedFocusCount: 2,
        sessionsBeforeLongBreak: 2,
      }),
      "long_break",
    );
  });

  it("resets focus index after a long break", () => {
    assert.deepEqual(
      nextFocusStateAfterBreak({
        phase: "long_break",
        focusIndex: 4,
        completedFocusCount: 4,
        sessionsBeforeLongBreak: 4,
      }),
      { focusIndex: 1, completedFocusCount: 0 },
    );

    assert.deepEqual(
      nextFocusStateAfterBreak({
        phase: "short_break",
        focusIndex: 2,
        completedFocusCount: 2,
        sessionsBeforeLongBreak: 4,
      }),
      { focusIndex: 3, completedFocusCount: 2 },
    );
  });

  it("exposes calm phase labels", () => {
    assert.equal(phaseLabel("focus"), "Focus");
    assert.equal(phaseLabel("short_break"), "Short break");
    assert.equal(phaseLabel("long_break"), "Long break");
  });

  it("tracks cycle dots for session 2 of 4", () => {
    const dots = cycleDotsState({
      sessionsBeforeLongBreak: 4,
      completedFocusCount: 1,
      phase: "focus",
      status: "running",
    });
    assert.equal(dots.total, 4);
    assert.equal(dots.filled, 1);
    assert.equal(dots.activeIndex, 2);
  });
});

describe("pomodoro preferences", () => {
  it("clamps custom durations", () => {
    const prefs = normalizePomodoroPreferences({
      focusDurationSeconds: 10,
      shortBreakSeconds: 99999,
      sessionsBeforeLongBreak: 0,
    });
    assert.equal(prefs.focusDurationSeconds, 60);
    assert.equal(prefs.shortBreakSeconds, 3 * 60 * 60);
    assert.equal(prefs.sessionsBeforeLongBreak, 1);
  });
});

describe("pomodoro focus logging rules", () => {
  it("discards sessions under 30 seconds and saves at 30+", () => {
    assert.equal(shouldSaveTimerSession(29), false);
    assert.equal(shouldSaveTimerSession(30), true);
    assert.equal(MIN_POMODORO_FOCUS_LOG_SECONDS, 30);
  });

  it("formats the compact daily summary", () => {
    assert.equal(
      formatPomodoroFocusedSummary({ sessionCount: 0, focusedSeconds: 0 }),
      "No sessions yet",
    );
    assert.equal(
      formatPomodoroFocusedSummary({
        sessionCount: 3,
        focusedSeconds: 75 * 60,
      }),
      "3 sessions · 1h 15m focused",
    );
  });
});

describe("pomodoro timestamp timing", () => {
  it("keeps countdown accurate across pause gaps", () => {
    const startedAt = "2026-10-19T12:00:00.000Z";
    const pausedAt = "2026-10-19T12:10:00.000Z";
    const nowMs = Date.parse("2026-10-19T12:12:00.000Z");

    const elapsedWhilePaused = activeElapsedSecondsFromSession({
      startedAt,
      pausedAt,
      accumulatedPausedSeconds: 0,
      nowMs,
    });
    assert.equal(elapsedWhilePaused, 10 * 60);

    const elapsedAfterResume = activeElapsedSecondsFromSession({
      startedAt,
      pausedAt: null,
      accumulatedPausedSeconds: 120,
      nowMs: Date.parse("2026-10-19T12:15:00.000Z"),
    });
    // 15 minutes wall - 2 minutes paused = 13 minutes
    assert.equal(elapsedAfterResume, 13 * 60);
  });
});
