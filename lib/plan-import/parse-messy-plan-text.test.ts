import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseMessyPlanItemLine,
  parseMessyPlanText,
  resolveMessyPlanDate,
} from "@/lib/plan-import/parse-messy-plan-text";

const JUNE_2026_NOW = new Date("2026-06-09T12:00:00Z");
const DECEMBER_2026_NOW = new Date("2026-12-20T12:00:00Z");

const WEDNESDAY_JUNE_PLAN = `Wednesday, June 17 🌿

Tasks
✅ Walk in the park with Nina
✅ Yoga at noon
✅ Taking a shower
✅ Fill out the rest of Turing forms
❌ Expoprint - at least 1 hr
❌ Agentic AI review
✅ Watch England-Croatia game`;

describe("parseMessyPlanText", () => {
  it("parses heading date, Tasks section, and status icons", () => {
    const result = parseMessyPlanText(WEDNESDAY_JUNE_PLAN, {
      now: JUNE_2026_NOW,
      fallbackDate: "2026-06-09",
    });

    assert.equal(result.date, "2026-06-17");
    assert.equal(result.items.length, 7);
    assert.equal(
      result.items.filter((item) => item.status === "DONE").length,
      5,
    );
    assert.equal(
      result.items.filter((item) => item.status === "NOT_DONE").length,
      2,
    );
    assert.equal(result.items.every((item) => item.type === "TASK"), true);
    assert.equal(result.items[0]?.title, "Walk in the park with Nina");
    assert.equal(
      result.items.some((item) => item.title.toLowerCase() === "tasks"),
      false,
    );
  });

  it("maps ✅ to DONE and ❌ to NOT_DONE", () => {
    assert.deepEqual(parseMessyPlanItemLine("✅ Done task"), {
      title: "Done task",
      status: "DONE",
    });
    assert.deepEqual(parseMessyPlanItemLine("❌ Missed task"), {
      title: "Missed task",
      status: "NOT_DONE",
    });
    assert.deepEqual(parseMessyPlanItemLine("☐ Open task"), {
      title: "Open task",
      status: "OPEN",
    });
  });

  it("ignores mixed blank lines", () => {
    const result = parseMessyPlanText(
      "Tasks\n\n\n✅ One task\n\n❌ Two task",
      { now: JUNE_2026_NOW },
    );

    assert.equal(result.items.length, 2);
  });

  it("uses fallback date when heading date is missing", () => {
    const result = parseMessyPlanText("Tasks\n✅ One\n✅ Two", {
      now: JUNE_2026_NOW,
      fallbackDate: "2026-06-15",
    });

    assert.equal(result.date, "2026-06-15");
    assert.equal(result.items.length, 2);
  });

  it("resolves yearless month-day using current year", () => {
    assert.equal(
      resolveMessyPlanDate("June 17", JUNE_2026_NOW),
      "2026-06-17",
    );
  });

  it("uses next year for January/February when importing in December", () => {
    assert.equal(
      resolveMessyPlanDate("January 5", DECEMBER_2026_NOW),
      "2027-01-05",
    );
    assert.equal(
      resolveMessyPlanDate("February 2", DECEMBER_2026_NOW),
      "2027-02-02",
    );
  });

  it("preserves Persian titles and strips decorative emojis from titles", () => {
    const result = parseMessyPlanText(
      `Intentions
✅ 🌿 مراقبت از گردن
✅ استراحت کوتاه`,
      { now: JUNE_2026_NOW },
    );

    assert.equal(result.items.length, 2);
    assert.match(result.items[0]?.title ?? "", /مراقبت از گردن/u);
    assert.doesNotMatch(result.items[0]?.title ?? "", /🌿/u);
    assert.equal(result.items.every((item) => item.type === "INTENTION"), true);
  });
});
