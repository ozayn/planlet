"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export function SettingsThemeControl() {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Theme</p>
        <p className="text-xs text-muted-light">Switch between day and night.</p>
      </div>
      <ThemeToggle variant="full" />
    </div>
  );
}
