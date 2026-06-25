"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getAppNavSections,
  isAppNavItemActive,
  type AppNavAccess,
  type AppNavSection,
} from "@/lib/app-nav";

type AppNavSectionsProps = {
  access: AppNavAccess;
  sections?: AppNavSection[];
  onNavigate?: () => void;
  collapsed?: boolean;
};

function navLinkClass(active: boolean, collapsed: boolean): string {
  return [
    "ui-app-nav-link flex min-h-10 items-center rounded-xl text-sm transition-colors hover:bg-accent-cream",
    collapsed ? "justify-center px-2" : "px-3",
    active
      ? "bg-accent-cream/60 font-medium text-foreground"
      : "text-foreground",
  ].join(" ");
}

export function AppNavSections({
  access,
  sections,
  onNavigate,
  collapsed = false,
}: AppNavSectionsProps) {
  const pathname = usePathname();
  const navSections = sections ?? getAppNavSections(access);

  return (
    <>
      {navSections.map((section) => (
        <section key={section.title} className="ui-app-nav-section">
          {collapsed ? null : (
            <p className="ui-app-nav-section-label">{section.title}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = isAppNavItemActive(pathname, item.key);

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={navLinkClass(isActive, collapsed)}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    {collapsed ? (
                      <span
                        className={`flex h-2 w-2 rounded-full ${
                          isActive ? "bg-accent-blue" : "bg-muted-light"
                        }`}
                        aria-hidden="true"
                      />
                    ) : (
                      item.label
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
