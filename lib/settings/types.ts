import type { ComponentType, ReactNode } from "react";

export const SETTINGS_CATEGORY_SLUGS = [
  "appearance",
  "ai",
  "voice-audio",
  "timer",
  "life-lab",
  "planner",
  "notifications",
  "account",
  "about",
] as const;

export type SettingsCategorySlug = (typeof SETTINGS_CATEGORY_SLUGS)[number];

export type SettingsCategoryIconName =
  | "appearance"
  | "ai"
  | "voice-audio"
  | "timer"
  | "life-lab"
  | "planner"
  | "notifications"
  | "account"
  | "about";

export type SettingsAccessContext = {
  isSignedIn: boolean;
  isAdmin: boolean;
  canUseLifeLabFeatures: boolean;
  canUseActivityTimerFeatures: boolean;
  showReflectionCoaching: boolean;
  hasReadAloudSettings: boolean;
  hasTimerPresets: boolean;
  hasNotifications: boolean;
};

export type SettingsCategoryDefinition = {
  slug: SettingsCategorySlug;
  title: string;
  subtitle?: string;
  icon: SettingsCategoryIconName;
  keywords: string[];
  isAvailable: (access: SettingsAccessContext) => boolean;
};

export type ClientSettingsCategory = {
  slug: SettingsCategorySlug;
  title: string;
  subtitle?: string;
  icon: SettingsCategoryIconName;
  keywords: string[];
};

export type SettingsItemDefinition = {
  id: string;
  categorySlug: SettingsCategorySlug;
  title: string;
  subtitle?: string;
  keywords: string[];
  anchor?: string;
  status?: "active" | "future";
  isAvailable: (access: SettingsAccessContext) => boolean;
};

export type ClientSettingsSearchEntry = {
  id: string;
  categorySlug: SettingsCategorySlug;
  title: string;
  subtitle?: string;
  keywords: string[];
  anchor?: string;
  status?: "active" | "future";
  categoryTitle: string;
  href: string;
};

export type SettingsSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  categoryTitle: string;
  matchedField: "title" | "subtitle" | "keyword";
};

/** @deprecated Use ClientSettingsSearchEntry for client-bound data */
export type SettingsSearchEntry = ClientSettingsSearchEntry;

export type SettingsCategoryPageProps = {
  access: SettingsAccessContext;
};

export type SettingsCategoryPageComponent = ComponentType<SettingsCategoryPageProps>;

export type SettingsCategoryRenderContext = SettingsCategoryPageProps & {
  children?: ReactNode;
};
