import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  APP_NAV_ICON_SIZE,
  APP_NAV_ICON_STROKE,
  BOTTOM_NAV_ICON_SIZE,
  getAppNavKeysMissingIcons,
  navigationIconMap,
} from "@/components/app-nav/app-nav-icon";
import { ALL_APP_NAV_ITEM_KEYS } from "@/lib/app-nav";

describe("navigationIconMap", () => {
  it("covers every primary app-nav item key", () => {
    assert.deepEqual(getAppNavKeysMissingIcons(), []);
    assert.equal(
      Object.keys(navigationIconMap).length,
      ALL_APP_NAV_ITEM_KEYS.length,
    );
    for (const key of ALL_APP_NAV_ITEM_KEYS) {
      const icon = navigationIconMap[key];
      assert.ok(icon, key);
      assert.equal(typeof icon, "object", key);
      assert.ok(icon.displayName, key);
    }
  });

  it("keeps Pomodoro and Timer on distinct Lucide icons", () => {
    assert.notEqual(navigationIconMap.pomodoro, navigationIconMap.timer);
    assert.equal(navigationIconMap.pomodoro.displayName, "Timer");
    assert.equal(navigationIconMap.timer.displayName, "Clock3");
  });

  it("uses the suggested primary mappings", () => {
    assert.equal(navigationIconMap.day.displayName, "CalendarDays");
    assert.equal(navigationIconMap.week.displayName, "CalendarRange");
    assert.equal(navigationIconMap.month.displayName, "Calendar");
    assert.equal(navigationIconMap.year.displayName, "CalendarFold");
    assert.equal(navigationIconMap["life-lab"].displayName, "Brain");
    assert.equal(navigationIconMap.coaching.displayName, "MessagesSquare");
  });

  it("standardizes icon size and stroke constants", () => {
    assert.equal(APP_NAV_ICON_SIZE, 18);
    assert.equal(BOTTOM_NAV_ICON_SIZE, 20);
    assert.equal(APP_NAV_ICON_STROKE, 1.75);
  });
});

describe("navigation icon wiring", () => {
  const root = join(import.meta.dirname, "..");

  it("reuses AppNavIcon / navigationIconMap in sidebar and bottom nav", () => {
    const sections = readFileSync(
      join(root, "components/app-nav/app-nav-sections.tsx"),
      "utf8",
    );
    const bottom = readFileSync(join(root, "components/bottom-nav.tsx"), "utf8");
    const iconModule = readFileSync(
      join(root, "components/app-nav/app-nav-icon.tsx"),
      "utf8",
    );

    assert.match(iconModule, /export const navigationIconMap/);
    assert.match(sections, /AppNavIcon/);
    assert.doesNotMatch(sections, /rounded-full/);
    assert.match(bottom, /AppNavIcon/);
    assert.doesNotMatch(bottom, /function NavIcon/);
    assert.doesNotMatch(bottom, /<svg/);
  });

  it("marks collapsed icon-only links with accessible names", () => {
    const sections = readFileSync(
      join(root, "components/app-nav/app-nav-sections.tsx"),
      "utf8",
    );
    assert.match(sections, /aria-label=\{collapsed \? item\.label : undefined\}/);
    assert.match(sections, /title=\{collapsed \? item\.label : undefined\}/);
    assert.match(sections, /min-h-11/);
  });

  it("keeps Pomodoro active-state detection aligned with its route", () => {
    const appNav = readFileSync(join(root, "lib/app-nav.ts"), "utf8");
    assert.match(appNav, /key === "pomodoro"/);
    assert.match(appNav, /pathname === "\/pomodoro"/);
  });
});
