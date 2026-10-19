import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_POMODORO_ACTIVITIES,
  MAX_POMODORO_TITLE_LENGTH,
} from "@/lib/pomodoro/constants";

describe("pomodoro activity limits", () => {
  it("keeps favorites as a small optional list", () => {
    assert.equal(MAX_POMODORO_ACTIVITIES, 20);
    assert.ok(MAX_POMODORO_TITLE_LENGTH >= 40);
  });
});
