"use client";

import {
  ThemeProvider as NextThemesProvider,
  useTheme,
} from "next-themes";
import type { ReactNode } from "react";

const THEME_STORAGE_KEY = "planlet-theme";
const LEGACY_THEME_STORAGE_KEY = "theme";

if (typeof window !== "undefined") {
  if (!localStorage.getItem(THEME_STORAGE_KEY)) {
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);

    if (legacy === "light" || legacy === "dark" || legacy === "system") {
      localStorage.setItem(THEME_STORAGE_KEY, legacy);
    }
  }
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

export { useTheme };
