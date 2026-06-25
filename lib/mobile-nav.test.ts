import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AppNavAccess } from "@/lib/app-nav";
import {
  DEFAULT_MOBILE_NAV_ITEMS,
  buildMobileNavRenderItems,
  getMobileDrawerItems,
  resolveMobileNavItems,
  sanitizeMobileNavItems,
} from "@/lib/mobile-nav";

const baseAccess: AppNavAccess = {
  isAdmin: false,
  canUseCoachingFeatures: true,
  canUseBodyJourneyFeatures: true,
  canUseJobTrackerFeatures: true,
  canUseCareerJourneyFeatures: true,
};

describe("sanitizeMobileNavItems", () => {
  it("returns defaults when stored value is empty", () => {
    assert.deepEqual(sanitizeMobileNavItems([], baseAccess), []);
    assert.deepEqual(resolveMobileNavItems([], baseAccess), DEFAULT_MOBILE_NAV_ITEMS);
  });

  it("filters invalid and inaccessible entries while preserving order", () => {
    const access: AppNavAccess = {
      ...baseAccess,
      canUseCoachingFeatures: false,
      isAdmin: false,
    };

    assert.deepEqual(
      sanitizeMobileNavItems(
        ["day", "coaching", "invalid", "jobs", "day", "week"],
        access,
      ),
      ["day", "jobs", "week"],
    );
  });

  it("limits selection to four tabs", () => {
    assert.deepEqual(
      sanitizeMobileNavItems(
        ["day", "week", "month", "year", "jobs", "career"],
        baseAccess,
      ),
      ["day", "week", "month", "year"],
    );
  });

  it("falls back to defaults when all stored entries are invalid", () => {
    assert.deepEqual(
      resolveMobileNavItems(["invalid", "admin"], baseAccess),
      DEFAULT_MOBILE_NAV_ITEMS,
    );
  });

  it("removes inaccessible tabs at render time", () => {
    const access: AppNavAccess = {
      ...baseAccess,
      canUseJobTrackerFeatures: false,
    };

    assert.deepEqual(resolveMobileNavItems(["jobs", "day"], access), ["day"]);
  });
});

describe("buildMobileNavRenderItems", () => {
  it("builds hrefs and labels for selected tabs", () => {
    const items = buildMobileNavRenderItems(["day", "jobs"], baseAccess);

    assert.equal(items.length, 2);
    assert.equal(items[0]?.key, "day");
    assert.equal(items[0]?.href, "/today");
    assert.equal(items[0]?.label, "Day");
    assert.equal(items[1]?.key, "jobs");
    assert.equal(items[1]?.href, "/jobs");
  });
});

describe("getMobileDrawerItems", () => {
  it("removes pinned items from drawer sections", () => {
    const allItems = [
      {
        title: "Planning",
        items: [
          { key: "day", label: "Day", href: "/today" },
          { key: "week", label: "Week", href: "/plans/week/2026-01-01" },
          { key: "plans", label: "Plans", href: "/plans" },
        ],
      },
      {
        title: "Reflection",
        items: [
          { key: "coaching", label: "Coaching", href: "/coaching" },
          { key: "body-journey", label: "Body Journey", href: "/body" },
        ],
      },
    ] as const;

    const drawerItems = getMobileDrawerItems({
      allItems: allItems.map((section) => ({
        title: section.title,
        items: [...section.items],
      })),
      pinnedItems: ["day", "week", "month", "year"],
    });

    assert.equal(drawerItems.length, 2);
    assert.deepEqual(
      drawerItems[0]?.items.map((item) => item.key),
      ["plans"],
    );
    assert.deepEqual(
      drawerItems[1]?.items.map((item) => item.key),
      ["coaching", "body-journey"],
    );
  });

  it("hides sections when all items are pinned", () => {
    const allItems = [
      {
        title: "Reflection",
        items: [
          { key: "coaching", label: "Coaching", href: "/coaching" },
          { key: "body-journey", label: "Body Journey", href: "/body" },
        ],
      },
      {
        title: "Planning",
        items: [{ key: "plans", label: "Plans", href: "/plans" }],
      },
    ];

    const drawerItems = getMobileDrawerItems({
      allItems,
      pinnedItems: ["coaching", "body-journey"],
    });

    assert.equal(drawerItems.length, 1);
    assert.equal(drawerItems[0]?.title, "Planning");
  });
});
