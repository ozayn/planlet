import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSettingsSearchIndex } from "@/lib/settings/registry";
import { searchSettings } from "@/lib/settings/search";
import type { SettingsAccessContext } from "@/lib/settings/types";

const fullAccess: SettingsAccessContext = {
  isSignedIn: true,
  isAdmin: true,
  canUseLifeLabFeatures: true,
  canUseCoachingFeatures: true,
  canUseActivityTimerFeatures: true,
  canUsePomodoroFeatures: true,
  showReflectionCoaching: true,
  hasReadAloudSettings: true,
  hasTimerPresets: true,
  hasPomodoroSettings: true,
  hasNotifications: true,
};

describe("searchSettings", () => {
  it("finds reading density when searching font", () => {
    const results = searchSettings(
      buildSettingsSearchIndex(fullAccess),
      "font",
    );

    assert.ok(
      results.some((result) => result.title === "Reading density"),
      "expected Reading density in font search results",
    );
  });

  it("finds narration settings when searching voice", () => {
    const results = searchSettings(
      buildSettingsSearchIndex(fullAccess),
      "voice",
    );

    assert.ok(
      results.some((result) => result.title === "Narration provider"),
      "expected Narration provider in voice search results",
    );
    assert.ok(
      results.some((result) => result.title === "Playback speed"),
      "expected Playback speed in voice search results",
    );
  });

  it("finds timer presets and future timer settings when searching timer", () => {
    const results = searchSettings(
      buildSettingsSearchIndex(fullAccess),
      "timer",
    );

    assert.ok(
      results.some((result) => result.title === "Timer presets"),
      "expected Timer presets in timer search results",
    );
    assert.ok(
      results.some((result) => result.title === "Completion sound"),
      "expected Completion sound in timer search results",
    );
  });

  it("finds Life Areas under Planning when searching life areas", () => {
    const results = searchSettings(
      buildSettingsSearchIndex(fullAccess),
      "life areas",
    );

    assert.ok(
      results.some((result) => result.title === "Life Areas"),
      "expected Life Areas in life areas search results",
    );
  });

  it("finds Focus Priorities for admins and hides them for non-admins", () => {
    const adminResults = searchSettings(
      buildSettingsSearchIndex(fullAccess),
      "focus priorities",
    );
    assert.ok(
      adminResults.some((result) => result.title === "Focus Priorities"),
      "expected Focus Priorities for admin",
    );

    const nonAdmin: SettingsAccessContext = {
      ...fullAccess,
      isAdmin: false,
    };
    const nonAdminResults = searchSettings(
      buildSettingsSearchIndex(nonAdmin),
      "focus priorities",
    );
    assert.equal(
      nonAdminResults.some((result) => result.title === "Focus Priorities"),
      false,
    );
  });

  it("returns empty results for blank queries", () => {
    assert.deepEqual(
      searchSettings(buildSettingsSearchIndex(fullAccess), "   "),
      [],
    );
  });

  it("links search results to category drill-down pages", () => {
    const results = searchSettings(
      buildSettingsSearchIndex(fullAccess),
      "reading density",
    );
    const match = results.find((result) => result.title === "Reading density");

    assert.ok(match);
    assert.equal(match.href, "/settings/appearance#reading-density");
  });
});

describe("buildSettingsSearchIndex", () => {
  it("omits voice settings when read-aloud is unavailable", () => {
    const access: SettingsAccessContext = {
      ...fullAccess,
      hasReadAloudSettings: false,
    };

    const titles = buildSettingsSearchIndex(access).map((entry) => entry.title);

    assert.ok(!titles.includes("Narration provider"));
    assert.ok(!titles.includes("Voice"));
  });

  it("keeps appearance settings for signed-out users", () => {
    const access: SettingsAccessContext = {
      ...fullAccess,
      isSignedIn: false,
      hasNotifications: false,
      hasReadAloudSettings: false,
      hasTimerPresets: false,
    };

    const titles = buildSettingsSearchIndex(access).map((entry) => entry.title);

    assert.ok(titles.includes("Theme"));
    assert.ok(!titles.includes("Reading density"));
  });

  it("returns serializable entries without availability callbacks", () => {
    for (const entry of buildSettingsSearchIndex(fullAccess)) {
      assert.equal(typeof (entry as { isAvailable?: unknown }).isAvailable, "undefined");
    }
  });
});
