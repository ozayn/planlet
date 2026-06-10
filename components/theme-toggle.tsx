"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
  variant?: "compact" | "full";
};

export function ThemeToggle({ variant = "full" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={variant === "compact" ? "h-8 w-14" : "h-11 w-[4.5rem]"}
        aria-hidden="true"
      />
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
      className={`relative inline-flex shrink-0 items-center rounded-full border border-border bg-surface/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
        variant === "compact" ? "h-8 w-14" : "h-11 w-[4.5rem]"
      } ${isNight ? "justify-end" : "justify-start"}`}
    >
      <span
        className={`flex items-center justify-center rounded-full border border-border-soft bg-accent-cream text-foreground shadow-sm transition-transform ${
          variant === "compact" ? "m-0.5 h-6 w-6" : "m-0.5 h-9 w-9"
        }`}
      >
        {isNight ? (
          <MoonIcon className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        ) : (
          <SunIcon className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
      </span>
    </button>
  );

  if (variant === "compact") {
    return switchControl;
  }

  return (
    <div className="space-y-3">
      <h2 className="ui-label">Appearance</h2>
      <div className="flex items-center gap-3">
        <span
          className={`min-w-8 text-sm ${
            !isNight ? "font-medium text-foreground" : "text-muted"
          }`}
        >
          Day
        </span>
        {switchControl}
        <span
          className={`min-w-8 text-sm ${
            isNight ? "font-medium text-foreground" : "text-muted"
          }`}
        >
          Night
        </span>
      </div>
      <p className="text-xs text-muted-light">
        Choose the app&apos;s color mode.
      </p>
    </div>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5Z" />
    </svg>
  );
}
