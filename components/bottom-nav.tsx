"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getMainNavItems, isMainNavActive, type MainNavKey } from "@/lib/main-nav";

export function BottomNav() {
  const pathname = usePathname();
  const navItems = getMainNavItems();

  return (
    <nav
      className="ui-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main navigation"
    >
      <ul className="ui-bottom-nav-list mx-auto flex max-w-lg items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = isMainNavActive(pathname, item.key);

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
                <NavIcon navKey={item.key} active={isActive} />
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

function NavIcon({ navKey, active }: { navKey: MainNavKey; active: boolean }) {
  const className = `h-5 w-5 ${active ? "stroke-foreground" : "stroke-muted-light"}`;

  switch (navKey) {
    case "day":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "week":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "month":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M7 4v2M17 4v2M5 8h14M6 6h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "year":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M4 7h16M4 11h16M4 15h16M4 19h16" />
        </svg>
      );
    default:
      return null;
  }
}
