export type TextDirection = "ltr" | "rtl" | "auto";

const PERSIAN_ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
const LATIN_SCRIPT = /[A-Za-z\u00C0-\u024F]/g;

export function countPersianArabicChars(text: string): number {
  return (text.match(PERSIAN_ARABIC_SCRIPT) ?? []).length;
}

export function countLatinChars(text: string): number {
  return (text.match(LATIN_SCRIPT) ?? []).length;
}

export function containsPersianArabicScript(text: string): boolean {
  return countPersianArabicChars(text) > 0;
}

/**
 * Resolve paragraph/list direction for mixed Persian–English content.
 * Dominant Persian → rtl (Vazirmatn via [dir=rtl]); dominant Latin → ltr;
 * roughly balanced mixed → auto for clean bidi.
 */
export function resolveTextDirection(text: string): TextDirection {
  const trimmed = text.trim();

  if (!trimmed) {
    return "auto";
  }

  const persian = countPersianArabicChars(trimmed);
  const latin = countLatinChars(trimmed);

  if (persian === 0 && latin === 0) {
    return "auto";
  }

  if (persian > 0 && latin === 0) {
    return "rtl";
  }

  if (latin > 0 && persian === 0) {
    return "ltr";
  }

  if (persian >= latin * 1.2) {
    return "rtl";
  }

  if (latin >= persian * 1.2) {
    return "ltr";
  }

  return "auto";
}

export function textDirectionLang(
  direction: TextDirection,
): "fa" | undefined {
  return direction === "rtl" ? "fa" : undefined;
}

/** Normalize Persian/Arabic orthography so search matches across variants. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\u200c/g, "") // ZWNJ
    .replace(/\u200d/g, "") // ZWJ
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ی")
    .toLowerCase();
}
