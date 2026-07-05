import {
  canAccessAppNavItem,
  getAppNavItem,
  getAppNavSections,
  isAppNavItemKey,
  type AppNavAccess,
  type AppNavItemKey,
  type AppNavSection,
} from "@/lib/app-nav";
import type { MainNavKey } from "@/lib/main-nav";

export const DEFAULT_MOBILE_NAV_ITEMS: AppNavItemKey[] = [
  "day",
  "week",
  "month",
  "year",
];

export const MAX_MOBILE_NAV_ITEMS = 4;

export type MobileNavRenderItem = {
  key: AppNavItemKey;
  label: string;
  href: string;
  accent: string;
};

const MOBILE_NAV_ACCENTS: Record<AppNavItemKey, string> = {
  day: "bg-accent-red",
  week: "bg-accent-blue",
  month: "bg-accent-yellow",
  year: "bg-foreground/30",
  plans: "bg-accent-blue",
  "unfinished-tasks": "bg-accent-red",
  insights: "bg-accent-yellow",
  themes: "bg-accent-red",
  coaching: "bg-accent-blue",
  "learning-journey": "bg-accent-yellow",
  "life-lab": "bg-accent-blue",
  "body-journey": "bg-accent-red",
  nudges: "bg-accent-blue",
  jobs: "bg-accent-yellow",
  career: "bg-accent-blue",
  admin: "bg-foreground/30",
};

const MOBILE_NAV_LABELS: Record<AppNavItemKey, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  plans: "Plans",
  "unfinished-tasks": "Review",
  insights: "Insights",
  themes: "Themes",
  coaching: "Coaching",
  "learning-journey": "Learning",
  "life-lab": "Life Lab",
  "body-journey": "Body",
  nudges: "Nudges",
  jobs: "Jobs",
  career: "Career",
  admin: "Admin",
};

export function getMobileNavLabel(key: AppNavItemKey): string {
  return MOBILE_NAV_LABELS[key];
}

export function sanitizeMobileNavItems(
  stored: string[] | null | undefined,
  access: AppNavAccess,
): AppNavItemKey[] {
  const seen = new Set<AppNavItemKey>();
  const sanitized: AppNavItemKey[] = [];

  for (const value of stored ?? []) {
    if (!isAppNavItemKey(value)) {
      continue;
    }

    if (!canAccessAppNavItem(value, access)) {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    sanitized.push(value);

    if (sanitized.length >= MAX_MOBILE_NAV_ITEMS) {
      break;
    }
  }

  return sanitized;
}

export function resolveMobileNavItems(
  stored: string[] | null | undefined,
  access: AppNavAccess,
): AppNavItemKey[] {
  const sanitized = sanitizeMobileNavItems(stored, access);

  if (sanitized.length > 0) {
    return sanitized;
  }

  return sanitizeMobileNavItems(DEFAULT_MOBILE_NAV_ITEMS, access);
}

export function buildMobileNavRenderItems(
  keys: AppNavItemKey[],
  access: AppNavAccess,
  now = new Date(),
): MobileNavRenderItem[] {
  return keys.flatMap((key) => {
    const item = getAppNavItem(key, access, now);

    if (!item) {
      return [];
    }

    return [
      {
        key: item.key,
        label: getMobileNavLabel(item.key),
        href: item.href,
        accent: MOBILE_NAV_ACCENTS[item.key],
      },
    ];
  });
}

export function getSelectableMobileNavSections(access: AppNavAccess) {
  return [
    {
      title: "Planning",
      items: (
        [
          "day",
          "week",
          "month",
          "year",
          "plans",
          "insights",
          "themes",
        ] as AppNavItemKey[]
      )
        .filter((key) => canAccessAppNavItem(key, access))
        .map((key) => ({ key, label: getMobileNavLabel(key) })),
    },
    {
      title: "Reflection",
      items: (["coaching", "learning-journey", "life-lab", "body-journey"] as AppNavItemKey[])
        .filter((key) => canAccessAppNavItem(key, access))
        .map((key) => ({ key, label: getMobileNavLabel(key) })),
    },
    {
      title: "Career",
      items: (["jobs", "career"] as AppNavItemKey[])
        .filter((key) => canAccessAppNavItem(key, access))
        .map((key) => ({ key, label: getMobileNavLabel(key) })),
    },
    {
      title: "Admin",
      items: (["admin"] as AppNavItemKey[])
        .filter((key) => canAccessAppNavItem(key, access))
        .map((key) => ({ key, label: getMobileNavLabel(key) })),
    },
  ].filter((section) => section.items.length > 0);
}

export function isMainMobileNavKey(key: AppNavItemKey): key is MainNavKey {
  return key === "day" || key === "week" || key === "month" || key === "year";
}

type GetMobileDrawerItemsParams = {
  allItems: AppNavSection[];
  pinnedItems: AppNavItemKey[];
};

export function getMobileDrawerItems({
  allItems,
  pinnedItems,
}: GetMobileDrawerItemsParams): AppNavSection[] {
  const pinnedSet = new Set(pinnedItems);

  return allItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !pinnedSet.has(item.key)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getMobileDrawerSections(
  access: AppNavAccess,
  pinnedItems: AppNavItemKey[],
  now = new Date(),
): AppNavSection[] {
  return getMobileDrawerItems({
    allItems: getAppNavSections(access, now),
    pinnedItems,
  });
}
