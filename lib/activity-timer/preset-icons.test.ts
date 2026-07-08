import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePresetIconName,
  resolvePresetIconName,
} from "@/lib/activity-timer/preset-icons";

describe("activity timer preset icons", () => {
  it("normalizes icon names to lowercase slugs", () => {
    assert.equal(normalizePresetIconName(" Book-Open "), "book-open");
    assert.equal(normalizePresetIconName(null), null);
  });

  it("falls back to circle for missing or unknown icon names", () => {
    assert.equal(resolvePresetIconName(null), "circle");
    assert.equal(resolvePresetIconName("not-a-real-icon"), "circle");
    assert.equal(resolvePresetIconName("foot"), "foot");
  });
});
