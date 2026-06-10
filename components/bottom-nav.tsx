"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/today", label: "Today", accent: "bg-accent-red" },
  { href: "/plans", label: "Plans", accent: "bg-accent-blue" },
  { href: "/insights", label: "Insights", accent: "bg-accent-yellow" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="ui-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main navigation"
    >
      <ul className="ui-bottom-nav-list mx-auto flex max-w-lg items-stretch justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`ui-bottom-nav-link relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-2 text-[0.6875rem] font-medium tracking-wide transition-colors ${
                  isActive ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {isActive ? (
                  <span
                    className={`absolute inset-x-5 top-0 h-0.5 rounded-full ${item.accent}`}
                    aria-hidden="true"
                  />
                ) : null}
                <NavIcon href={item.href} active={isActive} />
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

function NavIcon({ href, active }: { href: string; active: boolean }) {
  const className = `h-5 w-5 ${active ? "stroke-foreground" : "stroke-muted-light"}`;

  switch (href) {
    case "/today":
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
    case "/plans":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "/insights":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />
        </svg>
      );
    default:
      return null;
  }
}
