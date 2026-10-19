import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getRelativeDayNavigationLabel,
  getTodayDateString,
  shiftDateString,
} from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/action-labels";

function navLabels(currentDate: string, today: string) {
  const previousDate = shiftDateString(currentDate, -1);
  const nextDate = shiftDateString(currentDate, 1);
  return {
    previous:
      getRelativeDayNavigationLabel(previousDate, today) ??
      ACTION_LABELS.previousDay.title,
    next:
      getRelativeDayNavigationLabel(nextDate, today) ??
      ACTION_LABELS.nextDay.title,
  };
}

describe("getRelativeDayNavigationLabel", () => {
  it("returns Today, Yesterday, and Tomorrow for matching targets", () => {
    assert.equal(getRelativeDayNavigationLabel("2026-06-15", "2026-06-15"), "Today");
    assert.equal(getRelativeDayNavigationLabel("2026-06-14", "2026-06-15"), "Yesterday");
    assert.equal(getRelativeDayNavigationLabel("2026-06-16", "2026-06-15"), "Tomorrow");
  });

  it("returns null for non-adjacent dates", () => {
    assert.equal(getRelativeDayNavigationLabel("2026-06-10", "2026-06-15"), null);
    assert.equal(getRelativeDayNavigationLabel("2026-06-20", "2026-06-15"), null);
  });
});

describe("daily plan previous/next destination labels", () => {
  it("uses Yesterday / Tomorrow when viewing today", () => {
    assert.deepEqual(navLabels("2026-06-15", "2026-06-15"), {
      previous: "Yesterday",
      next: "Tomorrow",
    });
  });

  it("uses Previous day / Today when viewing yesterday", () => {
    assert.deepEqual(navLabels("2026-06-14", "2026-06-15"), {
      previous: "Previous day",
      next: "Today",
    });
  });

  it("uses Today / Next day when viewing tomorrow", () => {
    assert.deepEqual(navLabels("2026-06-16", "2026-06-15"), {
      previous: "Today",
      next: "Next day",
    });
  });

  it("falls back to Previous day / Next day for older dates", () => {
    assert.deepEqual(navLabels("2026-05-01", "2026-06-15"), {
      previous: "Previous day",
      next: "Next day",
    });
  });

  it("handles month boundaries", () => {
    assert.deepEqual(navLabels("2026-03-01", "2026-03-01"), {
      previous: "Yesterday",
      next: "Tomorrow",
    });
    assert.equal(
      getRelativeDayNavigationLabel("2026-02-28", "2026-03-01"),
      "Yesterday",
    );
    assert.deepEqual(navLabels("2026-02-28", "2026-03-01"), {
      previous: "Previous day",
      next: "Today",
    });
  });

  it("handles year boundaries", () => {
    assert.deepEqual(navLabels("2026-01-01", "2026-01-01"), {
      previous: "Yesterday",
      next: "Tomorrow",
    });
    assert.equal(
      getRelativeDayNavigationLabel("2025-12-31", "2026-01-01"),
      "Yesterday",
    );
    assert.deepEqual(navLabels("2025-12-31", "2026-01-01"), {
      previous: "Previous day",
      next: "Today",
    });
  });

  it("uses timezone-specific today for the same UTC instant", () => {
    // 2026-06-15 04:00 UTC → Jun 15 in New York, still Jun 14 in Los Angeles.
    const now = new Date("2026-06-15T04:00:00.000Z");
    const todayNy = getTodayDateString("America/New_York", now);
    const todayLa = getTodayDateString("America/Los_Angeles", now);

    assert.equal(todayNy, "2026-06-15");
    assert.equal(todayLa, "2026-06-14");

    assert.deepEqual(navLabels("2026-06-14", todayNy), {
      previous: "Previous day",
      next: "Today",
    });
    assert.deepEqual(navLabels("2026-06-14", todayLa), {
      previous: "Yesterday",
      next: "Tomorrow",
    });
  });

  it("keeps calendar-day labels stable across DST transitions", () => {
    // US spring forward 2026-03-08; fall back 2026-11-01.
    const beforeSpring = new Date("2026-03-08T06:30:00.000Z"); // 01:30 EST
    const afterSpring = new Date("2026-03-08T07:30:00.000Z"); // 03:30 EDT
    assert.equal(
      getTodayDateString("America/New_York", beforeSpring),
      "2026-03-08",
    );
    assert.equal(
      getTodayDateString("America/New_York", afterSpring),
      "2026-03-08",
    );

    assert.deepEqual(navLabels("2026-03-08", "2026-03-08"), {
      previous: "Yesterday",
      next: "Tomorrow",
    });
    assert.equal(
      getRelativeDayNavigationLabel("2026-03-07", "2026-03-08"),
      "Yesterday",
    );

    const beforeFall = new Date("2026-11-01T05:30:00.000Z"); // 01:30 EDT
    const afterFall = new Date("2026-11-01T06:30:00.000Z"); // 01:30 EST
    assert.equal(
      getTodayDateString("America/New_York", beforeFall),
      "2026-11-01",
    );
    assert.equal(
      getTodayDateString("America/New_York", afterFall),
      "2026-11-01",
    );

    assert.deepEqual(navLabels("2026-11-01", "2026-11-01"), {
      previous: "Yesterday",
      next: "Tomorrow",
    });
  });
});
