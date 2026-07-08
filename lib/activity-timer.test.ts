import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildActivityTimerInsights,
  elapsedSecondsFromStartedAt,
} from "@/lib/activity-timer";
import {
  formatActivityClock,
  formatActivityDuration,
  formatActivityDurationShort,
  formatActivityTotalMinutes,
  formatSessionTimeRange,
  truncateActivityNotesPreview,
} from "@/lib/activity-timer/format";
import { canUseActivityTimerFeatures } from "@/lib/roles";

describe("activity timer formatting", () => {
  it("formats durations for recent session labels", () => {
    assert.equal(formatActivityDuration(754), "12m 34s");
    assert.equal(formatActivityDuration(1082), "18m 02s");
    assert.equal(formatActivityDurationShort(720), "12 min");
    assert.equal(formatActivityDurationShort(754), "12m 34s");
    assert.equal(formatActivityTotalMinutes(2580), "43 minutes");
    assert.equal(formatActivityClock(754), "12:34");
  });

  it("calculates elapsed seconds from startedAt using wall clock time", () => {
    const startedAt = new Date("2026-07-08T12:00:00.000Z").toISOString();
    const nowMs = new Date("2026-07-08T12:05:30.000Z").getTime();

    assert.equal(elapsedSecondsFromStartedAt(startedAt, nowMs), 330);
  });

  it("truncates notes previews without exposing full text", () => {
    assert.equal(
      truncateActivityNotesPreview("Short note"),
      "Short note",
    );
    assert.match(
      truncateActivityNotesPreview("x".repeat(90)) ?? "",
      /…$/,
    );
  });
});

describe("activity timer insights", () => {
  it("totals today and week durations and finds the most timed activity", () => {
    const now = new Date("2026-07-08T15:00:00.000Z");
    const insights = buildActivityTimerInsights(
      [
        {
          id: "session-1",
          title: "Foot tapping — right foot",
          durationSeconds: 754,
          startedAt: new Date("2026-07-08T12:00:00.000Z"),
          stoppedAt: new Date("2026-07-08T12:14:00.000Z"),
        },
        {
          id: "session-2",
          title: "Room tidy — closet",
          durationSeconds: 1082,
          startedAt: new Date("2026-07-08T18:00:00.000Z"),
          stoppedAt: new Date("2026-07-08T18:10:00.000Z"),
        },
        {
          id: "session-3",
          title: "Foot tapping — right foot",
          durationSeconds: 400,
          startedAt: new Date("2026-07-07T10:00:00.000Z"),
          stoppedAt: new Date("2026-07-07T10:06:40.000Z"),
        },
      ],
      "America/New_York",
      now,
    );

    assert.equal(insights.todayTotalSeconds, 754 + 1082);
    assert.equal(insights.weekTotalSeconds, 754 + 1082 + 400);
    assert.equal(insights.mostTimedActivity, "Foot tapping — right foot");
    assert.equal(insights.todayTotalLabel, "30m 36s");
    assert.equal(insights.todayTotalMinutesLabel, "31 minutes");
    assert.equal(insights.todayTimeline.length, 2);
    assert.equal(
      insights.todayTimeline[0]?.timeRangeLabel,
      formatSessionTimeRange(
        new Date("2026-07-08T12:00:00.000Z"),
        new Date("2026-07-08T12:14:00.000Z"),
        "America/New_York",
      ),
    );
  });
});

describe("activity timer access", () => {
  it("allows admins and gated users only", () => {
    assert.equal(canUseActivityTimerFeatures({ role: "ADMIN" }), true);
    assert.equal(
      canUseActivityTimerFeatures({
        role: "USER",
        canUseActivityTimerFeatures: true,
      }),
      true,
    );
    assert.equal(
      canUseActivityTimerFeatures({
        role: "USER",
        canUseActivityTimerFeatures: false,
      }),
      false,
    );
    assert.equal(canUseActivityTimerFeatures({ role: "USER" }), false);
  });
});
