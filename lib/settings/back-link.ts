export type SettingsBackLink = {
  href: string;
  label: string;
};

const DEFAULT_SETTINGS_BACK: SettingsBackLink = {
  href: "/settings",
  label: "Settings",
};

/**
 * Resolve the single back link for a settings category page.
 * When Pomodoro Settings was opened from the timer, return to /pomodoro
 * instead of the Settings hub — never show two competing Back links.
 */
export function resolveSettingsCategoryBackLink(input: {
  category: string;
  from?: string | null;
}): SettingsBackLink {
  const raw = input.from?.trim() ?? "";
  if (!raw || input.category !== "pomodoro") {
    return DEFAULT_SETTINGS_BACK;
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (path === "/pomodoro" || path.startsWith("/pomodoro?")) {
    return { href: "/pomodoro", label: "Pomodoro" };
  }

  return DEFAULT_SETTINGS_BACK;
}
