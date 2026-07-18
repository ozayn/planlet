export const LIFE_LAB_READING_MODES = [
  "normal",
  "bionic",
  "focus",
  "comfortable",
  "dense",
  "study",
] as const;

export const LIFE_LAB_READING_FONT_SIZES = [
  "small",
  "default",
  "large",
  "extra-large",
] as const;

export const LIFE_LAB_READING_LINE_HEIGHTS = [
  "compact",
  "default",
  "relaxed",
] as const;

export const LIFE_LAB_READING_WIDTHS = [
  "narrow",
  "standard",
  "wide",
] as const;

export type LifeLabReadingMode = (typeof LIFE_LAB_READING_MODES)[number];
export type LifeLabReadingFontSize =
  (typeof LIFE_LAB_READING_FONT_SIZES)[number];
export type LifeLabReadingLineHeight =
  (typeof LIFE_LAB_READING_LINE_HEIGHTS)[number];
export type LifeLabReadingWidth = (typeof LIFE_LAB_READING_WIDTHS)[number];

export type LifeLabReadingPreferences = {
  readingMode: LifeLabReadingMode;
  readingFontSize: LifeLabReadingFontSize;
  readingLineHeight: LifeLabReadingLineHeight;
  readingWidth: LifeLabReadingWidth;
  readingHighContrast: boolean;
};

export const DEFAULT_LIFE_LAB_READING_PREFERENCES: LifeLabReadingPreferences = {
  readingMode: "normal",
  readingFontSize: "default",
  readingLineHeight: "default",
  readingWidth: "standard",
  readingHighContrast: false,
};

export const LIFE_LAB_READING_STORAGE_KEYS = {
  readingMode: "readingMode",
  readingFontSize: "readingFontSize",
  readingLineHeight: "readingLineHeight",
  readingWidth: "readingWidth",
  readingHighContrast: "readingHighContrast",
} as const;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

function includesValue<T extends string>(
  values: readonly T[],
  value: string | null,
): value is T {
  return value !== null && values.includes(value as T);
}

export function readLifeLabReadingPreferences(
  storage: ReadableStorage,
): LifeLabReadingPreferences {
  const mode = storage.getItem(LIFE_LAB_READING_STORAGE_KEYS.readingMode);
  const fontSize = storage.getItem(
    LIFE_LAB_READING_STORAGE_KEYS.readingFontSize,
  );
  const lineHeight = storage.getItem(
    LIFE_LAB_READING_STORAGE_KEYS.readingLineHeight,
  );
  const width = storage.getItem(LIFE_LAB_READING_STORAGE_KEYS.readingWidth);
  const highContrast = storage.getItem(
    LIFE_LAB_READING_STORAGE_KEYS.readingHighContrast,
  );

  return {
    readingMode: includesValue(LIFE_LAB_READING_MODES, mode)
      ? mode
      : DEFAULT_LIFE_LAB_READING_PREFERENCES.readingMode,
    readingFontSize: includesValue(LIFE_LAB_READING_FONT_SIZES, fontSize)
      ? fontSize
      : DEFAULT_LIFE_LAB_READING_PREFERENCES.readingFontSize,
    readingLineHeight: includesValue(
      LIFE_LAB_READING_LINE_HEIGHTS,
      lineHeight,
    )
      ? lineHeight
      : DEFAULT_LIFE_LAB_READING_PREFERENCES.readingLineHeight,
    readingWidth: includesValue(LIFE_LAB_READING_WIDTHS, width)
      ? width
      : DEFAULT_LIFE_LAB_READING_PREFERENCES.readingWidth,
    readingHighContrast: highContrast === "true",
  };
}

export function writeLifeLabReadingPreferences(
  storage: WritableStorage,
  preferences: LifeLabReadingPreferences,
): void {
  for (const key of Object.keys(
    LIFE_LAB_READING_STORAGE_KEYS,
  ) as Array<keyof LifeLabReadingPreferences>) {
    storage.setItem(
      LIFE_LAB_READING_STORAGE_KEYS[key],
      String(preferences[key]),
    );
  }
}

export function clearLifeLabReadingPreferences(
  storage: WritableStorage,
): void {
  for (const key of Object.values(LIFE_LAB_READING_STORAGE_KEYS)) {
    storage.removeItem(key);
  }
}
