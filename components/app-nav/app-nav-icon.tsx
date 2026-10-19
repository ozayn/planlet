import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarFold,
  CalendarRange,
  ClipboardList,
  Clock3,
  FolderKanban,
  HeartPulse,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Route,
  ShieldCheck,
  Timer,
} from "lucide-react";

import {
  ALL_APP_NAV_ITEM_KEYS,
  type AppNavItemKey,
} from "@/lib/app-nav";

export const APP_NAV_ICON_SIZE = 18;
export const APP_NAV_ICON_STROKE = 1.75;
export const BOTTOM_NAV_ICON_SIZE = 20;

/**
 * Shared Lucide mapping for every primary app-nav item.
 * Sidebar, drawer, collapsed sidebar, and bottom nav all use this registry.
 */
export const navigationIconMap: Record<AppNavItemKey, LucideIcon> = {
  day: CalendarDays,
  week: CalendarRange,
  month: Calendar,
  year: CalendarFold,
  plans: ClipboardList,
  "unfinished-tasks": ListChecks,
  insights: BarChart3,
  themes: FolderKanban,
  coaching: MessagesSquare,
  "learning-journey": BookOpen,
  ideas: Lightbulb,
  timer: Clock3,
  pomodoro: Timer,
  "life-lab": Brain,
  "learning-dictionary": BookMarked,
  "body-journey": HeartPulse,
  nudges: Bell,
  jobs: Briefcase,
  career: Route,
  admin: ShieldCheck,
};

type AppNavIconProps = {
  navKey: AppNavItemKey;
  className?: string;
  size?: number;
};

/** Decorative navigation icon; inherits currentColor from the link. */
export function AppNavIcon({
  navKey,
  className = "size-[18px] shrink-0",
  size = APP_NAV_ICON_SIZE,
}: AppNavIconProps) {
  const Icon = navigationIconMap[navKey];
  return (
    <Icon
      className={className}
      size={size}
      strokeWidth={APP_NAV_ICON_STROKE}
      aria-hidden="true"
    />
  );
}

export function hasAppNavIcon(navKey: AppNavItemKey): boolean {
  return Boolean(navigationIconMap[navKey]);
}

/** Test/audit helper: every registered nav key must have an icon. */
export function getAppNavKeysMissingIcons(): AppNavItemKey[] {
  return ALL_APP_NAV_ITEM_KEYS.filter((key) => !navigationIconMap[key]);
}
