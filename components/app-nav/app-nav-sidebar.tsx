"use client";

import { useCallback, useSyncExternalStore } from "react";

import { AppNavSections } from "@/components/app-nav/app-nav-sections";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { AppNavAccess } from "@/lib/app-nav";

const SIDEBAR_COLLAPSED_KEY = "planlet-sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "planlet-sidebar-collapsed-change";

type AppNavSidebarProps = {
  access: AppNavAccess;
};

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  };
}

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppNavSidebar({ access }: AppNavSidebarProps) {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    () => false,
  );

  const toggleCollapsed = useCallback(() => {
    const next = !readSidebarCollapsed();
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  }, []);

  return (
    <aside
      className={`ui-app-nav-sidebar sticky top-0 hidden h-dvh shrink-0 border-e border-border-soft bg-surface lg:flex lg:flex-col ${
        collapsed ? "ui-app-nav-sidebar-collapsed" : ""
      }`}
      aria-label="App navigation"
      data-nav-sidebar="docked"
    >
      <div className="ui-app-nav-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4">
        <AppNavSections access={access} collapsed={collapsed} />
      </div>

      <div className="border-t border-border-soft px-2 py-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          {...passwordManagerSafeControlProps}
          className="ui-app-nav-collapse-button flex min-h-10 w-full items-center justify-center rounded-xl text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹ Collapse"}
        </button>
      </div>
    </aside>
  );
}
