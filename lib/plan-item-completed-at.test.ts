import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveCompletedAt } from "@/lib/plan-item-completed-at";

describe("resolveCompletedAt", () => {
  const now = new Date("2026-06-09T12:00:00.000Z");
  const earlier = new Date("2026-06-08T12:00:00.000Z");

  it("sets completedAt when marking an item done", () => {
    assert.equal(
      resolveCompletedAt("OPEN", "DONE", null, now)?.toISOString(),
      now.toISOString(),
    );
  });

  it("clears completedAt when reopening a done item", () => {
    assert.equal(resolveCompletedAt("DONE", "OPEN", earlier, now), null);
  });

  it("preserves completedAt when already done", () => {
    assert.equal(
      resolveCompletedAt("DONE", "DONE", earlier, now)?.toISOString(),
      earlier.toISOString(),
    );
  });
});
