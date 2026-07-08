"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isAppNavItemActive, type AppNavItemKey } from "@/lib/app-nav";
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
      className="ui-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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

function NavIcon({
  navKey,
  active,
}: {
  navKey: AppNavItemKey;
  active: boolean;
}) {
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
    case "plans":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      );
    case "insights":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M4 19V5M4 19h16M8 15v-3M12 15V9M16 15V7" />
        </svg>
      );
    case "themes":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
          <path d="M5 19h14" />
        </svg>
      );
    case "coaching":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M8 10a4 4 0 1 1 8 0v1a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-1Z" />
          <path d="M12 14v3M9 20h6" />
        </svg>
      );
    case "learning-journey":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
        </svg>
      );
    case "ideas":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M12 3v3" />
          <path d="M18.4 5.6 16.3 7.7" />
          <path d="M5.6 5.6l2.1 2.1" />
          <path d="M12 10a4 4 0 0 1 4 4c0 1.5-.8 2.4-1.6 3.2-.5.6-.9 1.1-.9 1.8h-3c0-.7-.4-1.2-.9-1.8-.8-.8-1.6-1.7-1.6-3.2a4 4 0 0 1 4-4Z" />
          <path d="M10.5 21h3" />
        </svg>
      );
    case "timer":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2" />
          <path d="M9 3h6" />
        </svg>
      );
    case "life-lab":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M6 18h12" />
          <path d="M8 6h8l2 12H6L8 6Z" />
          <path d="M9 3h6" />
        </svg>
      );
    case "body-journey":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M12 4c1.5 0 2.5 1.2 2.5 2.6S13.5 9 12 9s-2.5-1.2-2.5-2.4S10.5 4 12 4Z" />
          <path d="M8.5 10.5 7 20h10l-1.5-9.5" />
        </svg>
      );
    case "jobs":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
          <path d="M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" />
          <path d="M4 13h16" />
        </svg>
      );
    case "career":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M4 19V9l8-4 8 4v10" />
          <path d="M9 19v-6h6v6" />
        </svg>
      );
    case "admin":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M12 3l7 4v6c0 4.4-3 7.6-7 8-4-.4-7-3.6-7-8V7l7-4Z" />
          <path d="M9.5 12.5 11 14l3.5-4" />
        </svg>
      );
    default:
      return null;
  }
}
