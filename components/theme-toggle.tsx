"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/action-icons";

type ThemeToggleProps = {
  variant?: "compact" | "full";
};

const COMPACT_SHELL_CLASS =
  "relative inline-flex h-9 w-16 shrink-0 rounded-full border border-border bg-surface/80";
const FULL_SHELL_CLASS =
  "relative inline-flex h-11 w-[4.5rem] shrink-0 rounded-full border border-border bg-surface/80";
const COMPACT_THUMB_CLASS =
  "absolute top-1/2 left-0.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-soft bg-accent-cream text-foreground shadow-sm transition-transform duration-200 ease-in-out";
const FULL_THUMB_CLASS =
  "absolute top-1/2 left-0.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-soft bg-accent-cream text-foreground shadow-sm transition-transform duration-200 ease-in-out";
const COMPACT_THUMB_OFFSET = "translate-x-8";
const FULL_THUMB_OFFSET = "translate-x-8";
const LABEL_CLASS = "w-10 shrink-0 text-center text-sm font-normal";

export function ThemeToggle({ variant = "full" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (variant === "compact") {
      return <TogglePlaceholder variant="compact" />;
    }

    return (
      <div className="flex items-center gap-3">
        <span className={LABEL_CLASS} aria-hidden="true">
          Day
        </span>
        <TogglePlaceholder variant="full" />
        <span className={LABEL_CLASS} aria-hidden="true">
          Night
        </span>
      </div>
    );
  }

  const isNight = resolvedTheme === "dark";

  function toggleTheme() {
    setTheme(isNight ? "light" : "dark");
  }

  const switchControl = (
    <button
      type="button"
      role="switch"
      aria-checked={isNight}
      aria-label="Toggle day/night theme"
      title={isNight ? "Switch to Day" : "Switch to Night"}
      onClick={toggleTheme}
      className={`${variant === "compact" ? COMPACT_SHELL_CLASS : FULL_SHELL_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
    >
      <span
        className={`${variant === "compact" ? COMPACT_THUMB_CLASS : FULL_THUMB_CLASS} ${
          isNight
            ? variant === "compact"
              ? COMPACT_THUMB_OFFSET
              : FULL_THUMB_OFFSET
            : "translate-x-0"
        }`}
      >
        <span className="relative flex h-full w-full items-center justify-center">
          <SunIcon
            className={`absolute transition-opacity duration-200 ${
              variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
            } ${isNight ? "opacity-0" : "opacity-100"}`}
          />
          <MoonIcon
            className={`absolute transition-opacity duration-200 ${
              variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
            } ${isNight ? "opacity-100" : "opacity-0"}`}
          />
        </span>
      </span>
    </button>
  );

  if (variant === "compact") {
    return switchControl;
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className={`${LABEL_CLASS} ${
          !isNight ? "text-foreground" : "text-muted"
        }`}
      >
        Day
      </span>
      {switchControl}
      <span
        className={`${LABEL_CLASS} ${
          isNight ? "text-foreground" : "text-muted"
        }`}
      >
        Night
      </span>
    </div>
  );
}

function TogglePlaceholder({ variant }: { variant: "compact" | "full" }) {
  return (
    <div
      className={variant === "compact" ? COMPACT_SHELL_CLASS : FULL_SHELL_CLASS}
      aria-hidden="true"
    />
  );
}

