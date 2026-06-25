export const THEME_STORAGE_KEY = "theme";

export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k)||"system";var d=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":t;document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(d);document.documentElement.style.colorScheme=d;}catch(e){}})();`;

export function resolveThemeSetting(value: string | null): ThemeSetting {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

export function resolveThemeFromSetting(setting: ThemeSetting): ResolvedTheme {
  if (setting === "light" || setting === "dark") {
    return setting;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  document.documentElement.style.colorScheme = resolved;
}
