"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEME_OPTIONS = [
  { value: "light", label: "Day" },
  { value: "dark", label: "Night" },
  { value: "system", label: "System" },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={compact ? "h-10 w-28" : "h-11"}
        aria-hidden="true"
      />
    );
  }

  const activeTheme = (theme ?? "system") as ThemeValue;

  if (compact) {
    return (
      <div
        className="flex gap-1 rounded-xl bg-accent-cream/40 p-1"
        role="group"
        aria-label="Appearance"
      >
        {THEME_OPTIONS.map((option) => {
          const isActive = activeTheme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-label={option.label}
              aria-pressed={isActive}
              title={option.label}
              className={`flex min-h-8 min-w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                isActive
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <ThemeIcon value={option.value} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="ui-label">Appearance</legend>
      <div className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((option) => {
          const isActive = activeTheme === option.value;

          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm transition-colors ${
                isActive ? "ui-segment-active" : "ui-segment"
              }`}
            >
              <input
                type="radio"
                name="planlet-theme"
                value={option.value}
                checked={isActive}
                onChange={() => setTheme(option.value)}
                className="sr-only"
              />
              <ThemeIcon value={option.value} />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ThemeIcon({ value }: { value: ThemeValue }) {
  const className = "h-4 w-4 shrink-0";

  switch (value) {
    case "light":
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
    case "dark":
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
    case "system":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" />
        </svg>
      );
  }
}
