"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { AppNavSections } from "@/components/app-nav/app-nav-sections";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { AppNavAccess, AppNavItemKey } from "@/lib/app-nav";
import { getMobileDrawerSections } from "@/lib/mobile-nav";

type AppNavDrawerContextValue = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const AppNavDrawerContext = createContext<AppNavDrawerContextValue | null>(
  null,
);

function useAppNavDrawer() {
  const context = useContext(AppNavDrawerContext);
  if (!context) {
    throw new Error("useAppNavDrawer must be used within AppNavDrawerProvider");
  }
  return context;
}

function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    function getFocusableElements() {
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));
    }

    const focusable = getFocusableElements();
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }

      const elements = getFocusableElements();
      if (elements.length === 0) {
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, containerRef]);
}

type AppNavDrawerProviderProps = {
  access: AppNavAccess;
  pinnedNavItemKeys: AppNavItemKey[];
  children: ReactNode;
};

export function AppNavDrawerProvider({
  access,
  pinnedNavItemKeys,
  children,
}: AppNavDrawerProviderProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const drawerSections = getMobileDrawerSections(access, pinnedNavItemKeys);

  const drawer =
    open && mounted ? (
      <div className="ui-app-nav-drawer-overlay md:hidden" role="presentation">
        <button
          type="button"
          aria-label="Close navigation menu"
          className="ui-app-nav-drawer-backdrop"
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-label="App navigation"
          className="ui-app-nav-drawer-panel"
        >
          <div className="ui-app-nav-drawer-header flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Navigate</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              {...passwordManagerSafeControlProps}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="ui-app-nav-drawer-body p-2">
            {drawerSections.length > 0 ? (
              <AppNavSections
                sections={drawerSections}
                access={access}
                onNavigate={() => setOpen(false)}
              />
            ) : (
              <p className="px-3 py-4 text-sm text-muted">
                All sections are in your quick access tabs.
              </p>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <AppNavDrawerContext.Provider
      value={{
        open,
        openDrawer: () => setOpen(true),
        closeDrawer: () => setOpen(false),
      }}
    >
      {children}
      {drawer ? createPortal(drawer, document.body) : null}
    </AppNavDrawerContext.Provider>
  );
}

export function AppNavMenuButton() {
  const { open, openDrawer } = useAppNavDrawer();

  return (
    <button
      type="button"
      onClick={openDrawer}
      {...passwordManagerSafeControlProps}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] md:hidden"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label="Open navigation menu"
    >
      <svg
        className="h-5 w-5 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
