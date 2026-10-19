import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveSettingsCategoryBackLink } from "@/lib/settings/back-link";

describe("resolveSettingsCategoryBackLink", () => {
  it("defaults to Settings hub", () => {
    assert.deepEqual(resolveSettingsCategoryBackLink({ category: "pomodoro" }), {
      href: "/settings",
      label: "Settings",
    });
  });

  it("returns Pomodoro when opened from the timer", () => {
    assert.deepEqual(
      resolveSettingsCategoryBackLink({
        category: "pomodoro",
        from: "/pomodoro",
      }),
      { href: "/pomodoro", label: "Pomodoro" },
    );
    assert.deepEqual(
      resolveSettingsCategoryBackLink({
        category: "pomodoro",
        from: "pomodoro",
      }),
      { href: "/pomodoro", label: "Pomodoro" },
    );
  });

  it("ignores from for other categories", () => {
    assert.deepEqual(
      resolveSettingsCategoryBackLink({
        category: "notifications",
        from: "/pomodoro",
      }),
      { href: "/settings", label: "Settings" },
    );
  });

  it("rejects unrelated from values", () => {
    assert.deepEqual(
      resolveSettingsCategoryBackLink({
        category: "pomodoro",
        from: "/life-lab",
      }),
      { href: "/settings", label: "Settings" },
    );
  });
});
