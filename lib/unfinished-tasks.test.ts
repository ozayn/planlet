import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  planTypesForUnfinishedTaskRange,
  resolveUnfinishedTaskRange,
  unfinishedTaskPlanDateFilter,
  unfinishedTaskPlanWhere,
} from "@/lib/unfinished-tasks";
import {
  UNFINISHED_TASK_ALL_RANGE_LIMIT,
  UNFINISHED_TASK_RECENT_DAYS,
} from "@/lib/unfinished-tasks/constants";

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
});
