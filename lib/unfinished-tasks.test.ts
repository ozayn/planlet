import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDayRange,
  getMonthRange,
  getTodayRange,
  getWeekRange,
  getYearRange,
} from "@/lib/dates";
import {
  normalizeUnfinishedTaskRange,
  planTypesForUnfinishedTaskRange,
  resolveUnfinishedTaskRange,
  unfinishedTaskPlanDateFilter,
  unfinishedTaskPlanStartedByFilter,
  unfinishedTaskPlanWhere,
} from "@/lib/unfinished-tasks";
import { buildUnfinishedTaskMetadataLine } from "@/lib/unfinished-tasks/metadata";
import {
  UNFINISHED_TASK_ALL_RANGE_LIMIT,
  UNFINISHED_TASK_RANGE_OPTIONS,
  UNFINISHED_TASK_RECENT_DAYS,
} from "@/lib/unfinished-tasks/constants";

function planMatchesStartedByFilter(
  plan: { dateStart: Date | null },
  end: Date,
): boolean {
  if (plan.dateStart == null) {
    return false;
  }
  return plan.dateStart.getTime() <= end.getTime();
}

function planMatchesOverlapFilter(
  plan: { dateStart: Date; dateEnd: Date },
  start: Date,
  end: Date,
): boolean {
  return (
    plan.dateStart.getTime() <= end.getTime() &&
    plan.dateEnd.getTime() >= start.getTime()
  );
}

describe("unfinished task query helpers", () => {
  const now = new Date("2026-07-02T15:00:00.000Z");

  it("resolves today/week/month/recent ranges in app timezone", () => {
    assert.equal(
      resolveUnfinishedTaskRange("today", now).start.toISOString(),
      "2026-07-02T04:00:00.000Z",
    );
    assert.equal(
      resolveUnfinishedTaskRange("week", now).start.toISOString(),
      "2026-06-29T04:00:00.000Z",
    );
    assert.equal(
      resolveUnfinishedTaskRange("month", now).start.toISOString(),
      "2026-07-01T04:00:00.000Z",
    );
    assert.equal(
      resolveUnfinishedTaskRange("recent", now).start.toISOString(),
      "2026-06-02T04:00:00.000Z",
    );
    assert.equal(UNFINISHED_TASK_RECENT_DAYS, 30);
  });

  it("includes week and month plan types for broader ranges", () => {
    assert.deepEqual(planTypesForUnfinishedTaskRange("today"), ["DAY"]);
    assert.deepEqual(planTypesForUnfinishedTaskRange("today_and_earlier"), [
      "DAY",
      "WEEK",
      "MONTH",
      "YEAR",
    ]);
    assert.deepEqual(planTypesForUnfinishedTaskRange("week"), [
      "DAY",
      "WEEK",
    ]);
    assert.deepEqual(planTypesForUnfinishedTaskRange("month"), [
      "DAY",
      "WEEK",
      "MONTH",
    ]);
    assert.deepEqual(planTypesForUnfinishedTaskRange("recent"), [
      "DAY",
      "WEEK",
      "MONTH",
    ]);
    assert.deepEqual(planTypesForUnfinishedTaskRange("all"), [
      "DAY",
      "WEEK",
      "MONTH",
      "YEAR",
    ]);
    assert.equal(UNFINISHED_TASK_ALL_RANGE_LIMIT, 100);
  });

  it("matches plans by planning-date overlap instead of createdAt", () => {
    const { start, end } = resolveUnfinishedTaskRange("week", now);
    const weekPlanStart = new Date("2026-06-29T04:00:00.000Z");
    const weekPlanEnd = new Date("2026-07-06T03:59:59.999Z");
    const dayPlanStart = new Date("2026-07-02T04:00:00.000Z");
    const dayPlanEnd = new Date("2026-07-03T03:59:59.999Z");
    const staleDayPlanStart = new Date("2026-06-22T04:00:00.000Z");
    const staleDayPlanEnd = new Date("2026-06-23T03:59:59.999Z");

    const filter = unfinishedTaskPlanDateFilter(start, end);

    assert.equal(weekPlanStart <= end && weekPlanEnd >= start, true);
    assert.equal(dayPlanStart <= end && dayPlanEnd >= start, true);
    assert.equal(staleDayPlanStart <= end && staleDayPlanEnd >= start, false);
    assert.deepEqual(filter, {
      dateStart: { lte: end },
      dateEnd: { gte: start },
    });
  });

  it("omits date bounds for the unrestricted All range", () => {
    assert.deepEqual(unfinishedTaskPlanWhere("user-1", "all", now), {
      userId: "user-1",
      type: { in: ["DAY", "WEEK", "MONTH", "YEAR"] },
    });
  });

  it("keeps existing range options and default normalization", () => {
    assert.deepEqual(
      UNFINISHED_TASK_RANGE_OPTIONS.map((option) => option.value),
      ["today", "today_and_earlier", "week", "month", "recent", "all"],
    );
    assert.equal(
      UNFINISHED_TASK_RANGE_OPTIONS.find(
        (option) => option.value === "today_and_earlier",
      )?.label,
      "Today & earlier",
    );
    assert.equal(normalizeUnfinishedTaskRange(undefined), "week");
    assert.equal(normalizeUnfinishedTaskRange("week"), "week");
    assert.equal(normalizeUnfinishedTaskRange("today"), "today");
    assert.equal(
      normalizeUnfinishedTaskRange("today_and_earlier"),
      "today_and_earlier",
    );
    assert.equal(normalizeUnfinishedTaskRange("bogus"), "week");
  });

  it("keeps overlap date bounds for existing bounded ranges", () => {
    const week = resolveUnfinishedTaskRange("week", now);
    assert.deepEqual(unfinishedTaskPlanWhere("user-1", "week", now), {
      userId: "user-1",
      type: { in: ["DAY", "WEEK"] },
      ...unfinishedTaskPlanDateFilter(week.start, week.end),
    });

    const today = resolveUnfinishedTaskRange("today", now);
    assert.deepEqual(unfinishedTaskPlanWhere("user-1", "today", now), {
      userId: "user-1",
      type: { in: ["DAY"] },
      ...unfinishedTaskPlanDateFilter(today.start, today.end),
    });
  });
});

describe("today & earlier unfinished task range", () => {
  const now = new Date("2026-07-02T15:00:00.000Z");
  const todayEnd = getTodayRange(now).end;

  it("filters by planning period start through end of today", () => {
    assert.deepEqual(
      unfinishedTaskPlanWhere("user-1", "today_and_earlier", now),
      {
        userId: "user-1",
        type: { in: ["DAY", "WEEK", "MONTH", "YEAR"] },
        ...unfinishedTaskPlanStartedByFilter(todayEnd),
      },
    );
    assert.equal(todayEnd.toISOString(), "2026-07-03T03:59:59.999Z");
  });

  it("includes yesterday and today day plans, excludes tomorrow", () => {
    const yesterday = getDayRange(new Date("2026-07-01T15:00:00.000Z"));
    const today = getDayRange(now);
    const tomorrow = getDayRange(new Date("2026-07-03T15:00:00.000Z"));

    assert.equal(
      planMatchesStartedByFilter({ dateStart: yesterday.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: today.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: tomorrow.start }, todayEnd),
      false,
    );
  });

  it("includes last month and excludes next month", () => {
    const lastMonth = getMonthRange(new Date("2026-06-15T15:00:00.000Z"));
    const nextMonth = getMonthRange(new Date("2026-08-15T15:00:00.000Z"));

    assert.equal(
      planMatchesStartedByFilter({ dateStart: lastMonth.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: nextMonth.start }, todayEnd),
      false,
    );
  });

  it("handles year boundaries for day and year plans", () => {
    const newYearsEve = getDayRange(new Date("2025-12-31T17:00:00.000Z"));
    const newYearsDay = getDayRange(new Date("2026-01-01T17:00:00.000Z"));
    const thisYear = getYearRange(now);
    const nextYear = getYearRange(new Date("2027-06-01T15:00:00.000Z"));
    const priorYear = getYearRange(new Date("2025-06-01T15:00:00.000Z"));

    assert.equal(
      planMatchesStartedByFilter({ dateStart: newYearsEve.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: newYearsDay.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: thisYear.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: priorYear.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: nextYear.start }, todayEnd),
      false,
    );
  });

  it("uses app timezone calendar dates, not raw UTC day boundaries", () => {
    // 2026-07-02 01:30 UTC is still 2026-07-01 evening in America/New_York.
    const lateEveningUtc = new Date("2026-07-02T01:30:00.000Z");
    const end = getTodayRange(lateEveningUtc).end;
    const july1 = getDayRange(new Date("2026-07-01T20:00:00.000Z"));
    const july2 = getDayRange(new Date("2026-07-02T20:00:00.000Z"));

    assert.equal(end.toISOString(), "2026-07-02T03:59:59.999Z");
    assert.equal(
      planMatchesStartedByFilter({ dateStart: july1.start }, end),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: july2.start }, end),
      false,
    );
  });

  it("handles daylight saving transitions around spring and fall", () => {
    // US spring forward 2026-03-08; fall back 2026-11-01 (America/New_York).
    const springDay = new Date("2026-03-08T17:00:00.000Z");
    const fallDay = new Date("2026-11-01T17:00:00.000Z");

    const springToday = getTodayRange(springDay);
    const fallToday = getTodayRange(fallDay);

    // EST (UTC-5) before spring forward → day ends 04:59:59.999Z next calendar day.
    assert.equal(springToday.start.toISOString(), "2026-03-08T05:00:00.000Z");
    assert.equal(springToday.end.toISOString(), "2026-03-09T03:59:59.999Z");

    // EDT (UTC-4) before fall back → day ends 04:59:59.999Z next calendar day.
    assert.equal(fallToday.start.toISOString(), "2026-11-01T04:00:00.000Z");
    assert.equal(fallToday.end.toISOString(), "2026-11-02T04:59:59.999Z");

    const springTomorrow = getDayRange(new Date("2026-03-09T17:00:00.000Z"));
    const fallTomorrow = getDayRange(new Date("2026-11-02T17:00:00.000Z"));

    assert.equal(
      planMatchesStartedByFilter(
        { dateStart: springToday.start },
        springToday.end,
      ),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter(
        { dateStart: springTomorrow.start },
        springToday.end,
      ),
      false,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: fallToday.start }, fallToday.end),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter(
        { dateStart: fallTomorrow.start },
        fallToday.end,
      ),
      false,
    );
  });

  it("includes broader plans only after their planning period has started", () => {
    const currentWeek = getWeekRange(now);
    const nextWeek = getWeekRange(new Date("2026-07-09T15:00:00.000Z"));
    const currentMonth = getMonthRange(now);
    const nextMonth = getMonthRange(new Date("2026-08-01T15:00:00.000Z"));
    const currentYear = getYearRange(now);
    const nextYear = getYearRange(new Date("2027-01-15T15:00:00.000Z"));

    // Future week created "yesterday" must still be excluded — dateStart wins.
    const futureWeekCreatedEarlier = {
      dateStart: nextWeek.start,
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
    };

    assert.equal(
      planMatchesStartedByFilter({ dateStart: currentWeek.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: nextWeek.start }, todayEnd),
      false,
    );
    assert.equal(
      planMatchesStartedByFilter(
        { dateStart: futureWeekCreatedEarlier.dateStart },
        todayEnd,
      ),
      false,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: currentMonth.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: nextMonth.start }, todayEnd),
      false,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: currentYear.start }, todayEnd),
      true,
    );
    assert.equal(
      planMatchesStartedByFilter({ dateStart: nextYear.start }, todayEnd),
      false,
    );
  });

  it("excludes undated plans from today & earlier", () => {
    assert.equal(planMatchesStartedByFilter({ dateStart: null }, todayEnd), false);
    // Broader "all" range has no dateStart predicate, so undated stay reachable there.
    assert.equal(
      "dateStart" in unfinishedTaskPlanWhere("user-1", "all", now),
      false,
    );
    assert.equal(
      "dateStart" in unfinishedTaskPlanWhere("user-1", "today_and_earlier", now),
      true,
    );
  });

  it("does not use overlap semantics that would pull in future-ending periods only", () => {
    const { start, end } = resolveUnfinishedTaskRange("week", now);
    const nextWeek = getWeekRange(new Date("2026-07-09T15:00:00.000Z"));

    // Overlap with "this week" correctly excludes next week.
    assert.equal(
      planMatchesOverlapFilter(
        { dateStart: nextWeek.start, dateEnd: nextWeek.end },
        start,
        end,
      ),
      false,
    );
    // today & earlier also excludes next week via started-by filter.
    assert.equal(
      planMatchesStartedByFilter({ dateStart: nextWeek.start }, todayEnd),
      false,
    );
  });
});

describe("unfinished task metadata", () => {
  it("omits redundant Open label for open tasks", () => {
    assert.equal(
      buildUnfinishedTaskMetadataLine({
        status: "OPEN",
        planDate: "2026-07-02",
        assignmentLabel: null,
        parentTitle: null,
        comment: null,
      }),
      "Jul 2",
    );
  });

  it("shows partial and skipped status in metadata", () => {
    assert.equal(
      buildUnfinishedTaskMetadataLine({
        status: "PARTIAL",
        planDate: "2026-07-02",
        assignmentLabel: null,
        parentTitle: null,
        comment: null,
      }),
      "Jul 2 · Partial",
    );
    assert.equal(
      buildUnfinishedTaskMetadataLine({
        status: "SKIPPED",
        planDate: "2026-07-02",
        assignmentLabel: null,
        parentTitle: null,
        comment: null,
      }),
      "Jul 2 · Skipped",
    );
  });

  it("shows move context from the existing moved-to comment note", () => {
    assert.equal(
      buildUnfinishedTaskMetadataLine({
        status: "MOVED",
        planDate: "2026-07-01",
        assignmentLabel: "Career",
        parentTitle: null,
        comment: "Moved to Thursday, Jul 2",
      }),
      "Moved from Jul 1 → Jul 2 · Career",
    );
  });

  it("falls back to source-only move metadata when destination is unknown", () => {
    assert.equal(
      buildUnfinishedTaskMetadataLine({
        status: "MOVED",
        planDate: "2026-07-01",
        assignmentLabel: null,
        parentTitle: null,
        comment: "Moved to someday",
      }),
      "Moved from Jul 1",
    );
  });
});
