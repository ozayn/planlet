import { getMainNavItems, isMainNavActive, type MainNavKey } from "@/lib/main-nav";
import {
  canShowBodyJourneyInProfileMenu,
  canShowCareerJourneyInProfileMenu,
  canShowCoachingInProfileMenu,
  canShowJobTrackerInProfileMenu,
  canShowLearningJourneyInProfileMenu,
  canShowLifeLabInProfileMenu,
  canShowIdeasInProfileMenu,
  canShowActivityTimerInProfileMenu,
  type ProfileMenuAccess,
} from "@/lib/profile-menu";

export type AppNavAccess = ProfileMenuAccess;

export type AppNavItemKey =
  | MainNavKey
  | "plans"
  | "unfinished-tasks"
  | "insights"
  | "themes"
  | "coaching"
  | "learning-journey"
  | "ideas"
  | "timer"
  | "life-lab"
  | "body-journey"
  | "nudges"
  | "jobs"
  | "career"
  | "admin";

export type AppNavItem = {
  key: AppNavItemKey;
  label: string;
  href: string;
};

export type AppNavSection = {
  title: string;
  items: AppNavItem[];
};

function planningItems(access: AppNavAccess, now = new Date()): AppNavItem[] {
  const mainItems = getMainNavItems(now);

  const items: AppNavItem[] = [
    ...mainItems.map((item) => ({
      key: item.key as AppNavItemKey,
      label: item.label,
      href: item.href,
    })),
    { key: "plans", label: "Plans", href: "/plans" },
    { key: "unfinished-tasks", label: "Unfinished tasks", href: "/unfinished" },
    { key: "insights", label: "Insights", href: "/insights" },
    { key: "themes", label: "Themes & projects", href: "/themes" },
  ];

  if (canShowActivityTimerInProfileMenu(access)) {
    items.push({ key: "timer", label: "Timer", href: "/timer" });
  }

  return items;
}

function reflectionItems(access: AppNavAccess): AppNavItem[] {
  const items: AppNavItem[] = [];

  if (canShowCoachingInProfileMenu(access)) {
    items.push({ key: "coaching", label: "Coaching", href: "/coaching" });
  }

  if (canShowLearningJourneyInProfileMenu(access)) {
    items.push({
      key: "learning-journey",
      label: "Learning Journey",
      href: "/learning",
    });
  }

  if (canShowIdeasInProfileMenu(access)) {
    items.push({ key: "ideas", label: "Ideas", href: "/ideas" });
  }

  if (canShowLifeLabInProfileMenu(access)) {
    items.push({
      key: "life-lab",
      label: "Life Lab",
      href: "/life-lab",
    });
  }

  if (canShowBodyJourneyInProfileMenu(access)) {
    items.push({
      key: "body-journey",
      label: "Body Journey",
      href: "/body",
    });
  }

  items.push({ key: "nudges", label: "Nudges", href: "/nudges" });

  return items;
}

function careerItems(access: AppNavAccess): AppNavItem[] {
  const items: AppNavItem[] = [];

  if (canShowJobTrackerInProfileMenu(access)) {
    items.push({ key: "jobs", label: "Job tracker", href: "/jobs" });
  }

  if (canShowCareerJourneyInProfileMenu(access)) {
    items.push({
      key: "career",
      label: "Career journey",
      href: "/career",
    });
  }

  return items;
}

function adminItems(access: AppNavAccess): AppNavItem[] {
  if (!access.isAdmin) {
    return [];
  }

  return [{ key: "admin", label: "Admin", href: "/admin" }];
}

export const ALL_APP_NAV_ITEM_KEYS: AppNavItemKey[] = [
  "day",
  "week",
  "month",
  "year",
  "plans",
  "unfinished-tasks",
  "insights",
  "themes",
  "coaching",
  "learning-journey",
  "ideas",
  "timer",
  "life-lab",
  "body-journey",
  "nudges",
  "jobs",
  "career",
  "admin",
];

export function isAppNavItemKey(value: string): value is AppNavItemKey {
  return ALL_APP_NAV_ITEM_KEYS.includes(value as AppNavItemKey);
}

export function canAccessAppNavItem(
  key: AppNavItemKey,
  access: AppNavAccess,
): boolean {
  switch (key) {
    case "day":
    case "week":
    case "month":
    case "year":
    case "plans":
    case "unfinished-tasks":
    case "insights":
    case "themes":
      return true;
    case "coaching":
      return canShowCoachingInProfileMenu(access);
    case "learning-journey":
      return canShowLearningJourneyInProfileMenu(access);
    case "ideas":
      return canShowIdeasInProfileMenu(access);
    case "timer":
      return canShowActivityTimerInProfileMenu(access);
    case "life-lab":
      return canShowLifeLabInProfileMenu(access);
    case "body-journey":
      return canShowBodyJourneyInProfileMenu(access);
    case "nudges":
      return true;
    case "jobs":
      return canShowJobTrackerInProfileMenu(access);
    case "career":
      return canShowCareerJourneyInProfileMenu(access);
    case "admin":
      return Boolean(access.isAdmin);
    default:
      return false;
  }
}

export function getAppNavSections(
  access: AppNavAccess,
  now = new Date(),
): AppNavSection[] {
  const sections: AppNavSection[] = [
    { title: "Planning", items: planningItems(access, now) },
    { title: "Reflection", items: reflectionItems(access) },
    { title: "Career", items: careerItems(access) },
    { title: "Admin", items: adminItems(access) },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function getFlatAppNavItems(
  access: AppNavAccess,
  now = new Date(),
): AppNavItem[] {
  return getAppNavSections(access, now).flatMap((section) => section.items);
}

export function getAppNavItem(
  key: AppNavItemKey,
  access: AppNavAccess,
  now = new Date(),
): AppNavItem | null {
  return (
    getFlatAppNavItems(access, now).find((item) => item.key === key) ?? null
  );
}

export function isAppNavItemActive(
  pathname: string,
  key: AppNavItemKey,
): boolean {
  if (key === "day" || key === "week" || key === "month" || key === "year") {
    return isMainNavActive(pathname, key);
  }

  if (key === "plans") {
    return (
      pathname === "/plans" ||
      pathname.startsWith("/plans/new") ||
      (pathname.startsWith("/plans/") &&
        !pathname.startsWith("/plans/day/") &&
        !pathname.startsWith("/plans/week/") &&
        !pathname.startsWith("/plans/month/") &&
        !pathname.startsWith("/plans/year/"))
    );
  }

  if (key === "insights") {
    return pathname === "/insights" || pathname.startsWith("/insights/");
  }

  if (key === "unfinished-tasks") {
    return pathname === "/unfinished" || pathname.startsWith("/unfinished/");
  }

  if (key === "themes") {
    return pathname === "/themes" || pathname.startsWith("/themes/");
  }

  if (key === "coaching") {
    return pathname === "/coaching" || pathname.startsWith("/coaching/");
  }

  if (key === "learning-journey") {
    return pathname === "/learning" || pathname.startsWith("/learning/");
  }

  if (key === "ideas") {
    return pathname === "/ideas" || pathname.startsWith("/ideas/");
  }

  if (key === "timer") {
    return pathname === "/timer" || pathname.startsWith("/timer/");
  }

  if (key === "life-lab") {
    return pathname === "/life-lab" || pathname.startsWith("/life-lab/");
  }

  if (key === "body-journey") {
    return pathname === "/body" || pathname.startsWith("/body/");
  }

  if (key === "nudges") {
    return pathname === "/nudges" || pathname.startsWith("/nudges/");
  }

  if (key === "jobs") {
    return pathname === "/jobs" || pathname.startsWith("/jobs/");
  }

  if (key === "career") {
    return pathname === "/career" || pathname.startsWith("/career/");
  }

  if (key === "admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }

  return false;
}
