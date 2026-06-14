"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * next-themes injects an inline <script> to prevent theme flash before hydration.
 * React 19 logs a dev-only warning ("Encountered a script tag while rendering
 * React component"). Setup matches the recommended pattern; the script still runs
 * correctly during SSR. Safe to ignore in development until next-themes updates.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="planlet-theme"
      themes={["light", "dark", "system"]}
    >
      {children}
    </NextThemesProvider>
  );
}
