"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AppNavIcon,
  BOTTOM_NAV_ICON_SIZE,
} from "@/components/app-nav/app-nav-icon";
import { isAppNavItemActive } from "@/lib/app-nav";
import type { MobileNavRenderItem } from "@/lib/mobile-nav";

type BottomNavProps = {
  items: MobileNavRenderItem[];
};

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="ui-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Quick access navigation"
    >
      <ul className="ui-bottom-nav-list mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const isActive = isAppNavItemActive(pathname, item.key);

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                className={`ui-bottom-nav-link relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium tracking-wide transition-colors ${
                  isActive ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive ? (
                  <span
                    className={`absolute inset-x-5 top-0 h-0.5 rounded-full ${item.accent}`}
                    aria-hidden="true"
                  />
                ) : null}
                <AppNavIcon
                  navKey={item.key}
                  className="h-5 w-5 shrink-0"
                  size={BOTTOM_NAV_ICON_SIZE}
                />
                <span className="ui-bottom-nav-label" dir="auto">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
