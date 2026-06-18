import {
  formatDateString,
  formatMonthStartString,
  formatWeekStartString,
} from "@/lib/dates";

export const MAIN_NAV_KEYS = ["day", "week", "month"] as const;
export type MainNavKey = (typeof MAIN_NAV_KEYS)[number];

export type MainNavItem = {
  key: MainNavKey;
  label: string;
  href: string;
  accent: string;
};

const ACCENTS: Record<MainNavKey, string> = {
  day: "bg-accent-red",
  week: "bg-accent-blue",
  month: "bg-accent-yellow",
};

export function getMainNavItems(now = new Date()): MainNavItem[] {
  const weekStart = formatWeekStartString(now);
  const monthStart = formatMonthStartString(now);

  return [
    { key: "day", label: "Day", href: "/today", accent: ACCENTS.day },
    {
      key: "week",
      label: "Week",
      href: `/plans/week/${weekStart}`,
      accent: ACCENTS.week,
    },
    {
      key: "month",
      label: "Month",
      href: `/plans/month/${monthStart}`,
      accent: ACCENTS.month,
    },
  ];
}

export function isMainNavActive(pathname: string, key: MainNavKey): boolean {
  if (key === "day") {
    return pathname === "/today" || pathname.startsWith("/plans/day/");
  }

  if (key === "week") {
    return pathname.startsWith("/plans/week/");
  }

  if (key === "month") {
    return pathname.startsWith("/plans/month/");
  }

  return false;
}

/** Current calendar date for nav links (stable within a render). */
export function getMainNavAnchorDate(): string {
  return formatDateString(new Date());
}
