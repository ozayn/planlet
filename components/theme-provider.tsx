"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  resolveThemeFromSetting,
  resolveThemeSetting,
  type ResolvedTheme,
  type ThemeSetting,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeSetting;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeSetting) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = resolveThemeSetting(localStorage.getItem(THEME_STORAGE_KEY));
    setThemeState(stored);
    const resolved = resolveThemeFromSetting(stored);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncSystemTheme() {
      const resolved = resolveThemeFromSetting("system");
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    }

    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);

    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme(nextTheme) {
        setThemeState(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        const resolved = resolveThemeFromSetting(nextTheme);
        setResolvedTheme(resolved);
        applyResolvedTheme(resolved);
      },
    }),
    [theme, resolvedTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
