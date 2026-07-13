import type {
  ClientSettingsCategory,
  ClientSettingsSearchEntry,
  SettingsAccessContext,
  SettingsCategoryDefinition,
  SettingsCategorySlug,
  SettingsItemDefinition,
} from "@/lib/settings/types";

export const SETTINGS_CATEGORIES: SettingsCategoryDefinition[] = [
  {
    slug: "appearance",
    title: "Appearance",
    subtitle: "Theme, reading density, display",
    icon: "appearance",
    keywords: ["theme", "dark", "light", "display", "font", "typography", "density"],
    isAvailable: () => true,
  },
  {
    slug: "ai",
    title: "AI",
    subtitle: "Models and server capabilities",
    icon: "ai",
    keywords: ["openai", "parsing", "transcription", "model", "llm"],
    isAvailable: () => true,
  },
  {
    slug: "voice-audio",
    title: "Voice & Audio",
    subtitle: "Narration and playback",
    icon: "voice-audio",
    keywords: ["voice", "audio", "narration", "read aloud", "tts", "speech"],
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    slug: "timer",
    title: "Timer",
    subtitle: "Presets and activity defaults",
    icon: "timer",
    keywords: ["timer", "countdown", "activity", "preset", "tongue", "walking"],
    isAvailable: (access) => access.hasTimerPresets,
  },
  {
    slug: "life-lab",
    title: "Life Lab",
    subtitle: "Learning and reading preferences",
    icon: "life-lab",
    keywords: ["life lab", "learning", "flashcards", "diagram", "playlist", "study"],
    isAvailable: (access) =>
      access.canUseLifeLabFeatures || access.showReflectionCoaching,
  },
  {
    slug: "planner",
    title: "Planner",
    subtitle: "Timezone, tasks, and navigation",
    icon: "planner",
    keywords: ["planner", "planning", "timezone", "tasks", "calendar", "week"],
    isAvailable: (access) => access.isSignedIn,
  },
  {
    slug: "notifications",
    title: "Notifications",
    subtitle: "Reminders and push alerts",
    icon: "notifications",
    keywords: ["notifications", "reminder", "push", "alert", "morning", "evening"],
    isAvailable: (access) => access.hasNotifications,
  },
  {
    slug: "account",
    title: "Account",
    subtitle: "Profile and sign out",
    icon: "account",
    keywords: ["account", "profile", "email", "logout", "sign out"],
    isAvailable: (access) => access.isSignedIn,
  },
  {
    slug: "about",
    title: "About",
    subtitle: "Version, install, and technical info",
    icon: "about",
    keywords: ["about", "version", "install", "technical", "privacy", "license"],
    isAvailable: () => true,
  },
];

export const SETTINGS_ITEMS: SettingsItemDefinition[] = [
  {
    id: "theme",
    categorySlug: "appearance",
    title: "Theme",
    subtitle: "Day and night appearance",
    keywords: ["theme", "dark", "light", "night", "day", "appearance"],
    anchor: "theme",
    isAvailable: () => true,
  },
  {
    id: "reading-density",
    categorySlug: "appearance",
    title: "Reading density",
    subtitle: "Compact or comfortable typography",
    keywords: ["reading density", "font", "typography", "compact", "comfortable", "spacing"],
    anchor: "reading-density",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "language",
    categorySlug: "appearance",
    title: "Language",
    subtitle: "App language preferences",
    keywords: ["language", "locale", "translation"],
    anchor: "language",
    status: "future",
    isAvailable: () => false,
  },
  {
    id: "reduce-motion",
    categorySlug: "appearance",
    title: "Reduce motion",
    subtitle: "Minimize animations",
    keywords: ["reduce motion", "animation", "accessibility"],
    anchor: "reduce-motion",
    status: "future",
    isAvailable: () => false,
  },
  {
    id: "ai-parsing",
    categorySlug: "ai",
    title: "AI parsing",
    subtitle: "Text plan import availability",
    keywords: ["ai", "parsing", "import", "openai"],
    anchor: "ai-parsing",
    isAvailable: () => true,
  },
  {
    id: "audio-transcription",
    categorySlug: "ai",
    title: "Audio transcription",
    subtitle: "Speech-to-text availability",
    keywords: ["audio", "transcription", "speech", "whisper"],
    anchor: "audio-transcription",
    isAvailable: () => true,
  },
  {
    id: "image-extraction",
    categorySlug: "ai",
    title: "Image text extraction",
    subtitle: "OCR availability",
    keywords: ["image", "ocr", "extraction", "scan"],
    anchor: "image-extraction",
    isAvailable: () => true,
  },
  {
    id: "narration-provider",
    categorySlug: "voice-audio",
    title: "Narration provider",
    subtitle: "Device or OpenAI voice",
    keywords: ["narration", "provider", "voice", "read aloud", "tts", "openai"],
    anchor: "narration-provider",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "narration-style",
    categorySlug: "voice-audio",
    title: "Narration style",
    subtitle: "OpenAI delivery tone",
    keywords: ["narration", "style", "british", "openai", "voice"],
    anchor: "openai-narration",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "openai-voice",
    categorySlug: "voice-audio",
    title: "OpenAI voice",
    subtitle: "Built-in OpenAI TTS voice",
    keywords: ["openai", "voice", "marin", "shimmer", "narration"],
    anchor: "openai-voice",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "narration-voice",
    categorySlug: "voice-audio",
    title: "Voice",
    subtitle: "Device voice selection",
    keywords: ["voice", "speech", "narration", "read aloud"],
    anchor: "narration-voice",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "playback-speed",
    categorySlug: "voice-audio",
    title: "Playback speed",
    subtitle: "Read-aloud speech rate",
    keywords: ["playback speed", "rate", "voice", "narration", "speech"],
    anchor: "playback-speed",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "cache-narration",
    categorySlug: "voice-audio",
    title: "Cache narration",
    subtitle: "Store generated audio locally",
    keywords: ["cache", "narration", "audio", "offline"],
    anchor: "cache-narration",
    status: "future",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "read-aloud-continue",
    categorySlug: "voice-audio",
    title: "Continue automatically",
    subtitle: "Advance to the next section after each one",
    keywords: ["continue", "auto", "section", "narration", "read aloud"],
    anchor: "read-aloud-continue",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "read-aloud-sections",
    categorySlug: "voice-audio",
    title: "Read aloud sections",
    subtitle: "Choose included note sections",
    keywords: ["sections", "summary", "flashcards", "transcript", "narration"],
    anchor: "read-aloud-sections",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "skip-technical-sections",
    categorySlug: "voice-audio",
    title: "Skip technical sections",
    subtitle: "Omit code blocks when reading aloud",
    keywords: ["technical", "skip", "code", "narration"],
    anchor: "skip-technical-sections",
    status: "future",
    isAvailable: (access) => access.hasReadAloudSettings,
  },
  {
    id: "timer-presets",
    categorySlug: "timer",
    title: "Timer presets",
    subtitle: "Built-in and custom activities",
    keywords: ["timer", "preset", "activity", "tongue", "walking", "stairs", "countdown"],
    anchor: "timer-presets",
    isAvailable: (access) => access.hasTimerPresets,
  },
  {
    id: "completion-sound",
    categorySlug: "timer",
    title: "Completion sound",
    subtitle: "Sound when a timer finishes",
    keywords: ["completion sound", "timer", "alert", "sound"],
    anchor: "completion-sound",
    status: "future",
    isAvailable: (access) => access.hasTimerPresets,
  },
  {
    id: "timer-haptics",
    categorySlug: "timer",
    title: "Haptics",
    subtitle: "Vibration on timer events",
    keywords: ["haptics", "vibration", "timer"],
    anchor: "timer-haptics",
    status: "future",
    isAvailable: (access) => access.hasTimerPresets,
  },
  {
    id: "life-lab-reading",
    categorySlug: "life-lab",
    title: "Reading preferences",
    subtitle: "Life Lab reading defaults",
    keywords: ["reading", "life lab", "notes", "study"],
    anchor: "reading-preferences",
    isAvailable: (access) => access.canUseLifeLabFeatures,
  },
  {
    id: "reflection-coaching",
    categorySlug: "life-lab",
    title: "Reflection & coaching",
    subtitle: "Coaching and insights shortcuts",
    keywords: ["reflection", "coaching", "insights", "therapy"],
    anchor: "reflection-coaching",
    isAvailable: (access) => access.showReflectionCoaching,
  },
  {
    id: "timezone",
    categorySlug: "planner",
    title: "Timezone",
    subtitle: "Automatic or manual timezone",
    keywords: ["timezone", "time zone", "clock", "automatic"],
    anchor: "timezone",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "item-style",
    categorySlug: "planner",
    title: "Item style",
    subtitle: "Minimal or expressive task marks",
    keywords: ["item style", "tasks", "checklist", "minimal", "expressive"],
    anchor: "item-style",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "task-organization",
    categorySlug: "planner",
    title: "Task organization",
    subtitle: "How assigned tasks appear",
    keywords: ["task organization", "assigned", "tasks", "planning"],
    anchor: "task-organization",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "quick-access-tabs",
    categorySlug: "planner",
    title: "Quick access tabs",
    subtitle: "Mobile bottom navigation",
    keywords: ["quick access", "tabs", "navigation", "mobile", "bottom nav"],
    anchor: "quick-access-tabs",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "themes-projects",
    categorySlug: "planner",
    title: "Themes & projects",
    subtitle: "Organize plans by theme",
    keywords: ["themes", "projects", "organization", "planner"],
    anchor: "themes-projects",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "daily-reminder",
    categorySlug: "notifications",
    title: "Daily reminder",
    subtitle: "Morning and evening plan reminders",
    keywords: ["daily reminder", "morning", "evening", "push", "notification"],
    anchor: "daily-reminder",
    isAvailable: (access) => access.hasNotifications,
  },
  {
    id: "push-notifications",
    categorySlug: "notifications",
    title: "Push notifications",
    subtitle: "Phone notification subscription",
    keywords: ["push", "notifications", "phone", "subscribe"],
    anchor: "push-notifications",
    isAvailable: (access) => access.hasNotifications,
  },
  {
    id: "profile",
    categorySlug: "account",
    title: "Profile",
    subtitle: "Name, email, and avatar",
    keywords: ["profile", "account", "email", "name", "avatar"],
    anchor: "profile",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "sign-out",
    categorySlug: "account",
    title: "Sign out",
    subtitle: "Log out of Planlet",
    keywords: ["sign out", "logout", "account"],
    anchor: "sign-out",
    isAvailable: (access) => access.isSignedIn,
  },
  {
    id: "install-app",
    categorySlug: "about",
    title: "Install Planlet",
    subtitle: "Add to home screen",
    keywords: ["install", "home screen", "pwa", "app"],
    anchor: "install-app",
    isAvailable: () => true,
  },
  {
    id: "technical-info",
    categorySlug: "about",
    title: "Technical info",
    subtitle: "Version and server capabilities",
    keywords: ["technical", "version", "timezone", "server"],
    anchor: "technical-info",
    isAvailable: () => true,
  },
];

export function isSettingsCategorySlug(value: string): value is SettingsCategorySlug {
  return SETTINGS_CATEGORIES.some((category) => category.slug === value);
}

export function getSettingsCategory(
  slug: SettingsCategorySlug,
): SettingsCategoryDefinition | undefined {
  return SETTINGS_CATEGORIES.find((category) => category.slug === slug);
}

function toClientCategory(
  category: SettingsCategoryDefinition,
): ClientSettingsCategory {
  const { isAvailable: _isAvailable, ...clientCategory } = category;
  return clientCategory;
}

function toClientSearchEntry(
  item: SettingsItemDefinition,
  categoryTitle: string,
  href: string,
): ClientSettingsSearchEntry {
  const { isAvailable: _isAvailable, ...clientItem } = item;
  return {
    ...clientItem,
    categoryTitle,
    href,
  };
}

export function getAvailableCategories(
  access: SettingsAccessContext,
): ClientSettingsCategory[] {
  return SETTINGS_CATEGORIES.filter((category) => category.isAvailable(access)).map(
    toClientCategory,
  );
}

function categoryHref(slug: SettingsCategorySlug, anchor?: string): string {
  const base = `/settings/${slug}`;
  return anchor ? `${base}#${anchor}` : base;
}

export function buildSettingsSearchIndex(
  access: SettingsAccessContext,
): ClientSettingsSearchEntry[] {
  const availableCategories = new Set(
    getAvailableCategories(access).map((category) => category.slug),
  );
  const categoryTitles = new Map(
    SETTINGS_CATEGORIES.map((category) => [category.slug, category.title]),
  );

  return SETTINGS_ITEMS.filter((item) => {
    if (!availableCategories.has(item.categorySlug)) {
      return false;
    }

    return item.isAvailable(access);
  }).map((item) =>
    toClientSearchEntry(
      item,
      categoryTitles.get(item.categorySlug) ?? item.categorySlug,
      categoryHref(item.categorySlug, item.anchor),
    ),
  );
}

export function getActiveSettingsItems(
  access: SettingsAccessContext,
  categorySlug: SettingsCategorySlug,
): SettingsItemDefinition[] {
  return SETTINGS_ITEMS.filter(
    (item) =>
      item.categorySlug === categorySlug &&
      item.status !== "future" &&
      item.isAvailable(access),
  );
}
