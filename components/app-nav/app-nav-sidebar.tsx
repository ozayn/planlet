"use client";

import { useEffect, useState } from "react";

import { AppNavSections } from "@/components/app-nav/app-nav-sections";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { AppNavAccess } from "@/lib/app-nav";

const SIDEBAR_COLLAPSED_KEY = "planlet-sidebar-collapsed";

type AppNavSidebarProps = {
  access: AppNavAccess;
};

export function AppNavSidebar({ access }: AppNavSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }

  const isCollapsed = hydrated && collapsed;

  return (
    <aside
      className={`ui-app-nav-sidebar sticky top-0 hidden h-dvh shrink-0 border-e border-border-soft bg-surface md:flex md:flex-col ${
        isCollapsed ? "ui-app-nav-sidebar-collapsed" : ""
      }`}
      aria-label="App navigation"
    >
      <div className="ui-app-nav-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4">
        <AppNavSections access={access} collapsed={isCollapsed} />
      </div>

      <div className="border-t border-border-soft px-2 py-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          {...passwordManagerSafeControlProps}
          className="ui-app-nav-collapse-button flex min-h-10 w-full items-center justify-center rounded-xl text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "›" : "‹ Collapse"}
        </button>
      </div>
    </aside>
  );
}
