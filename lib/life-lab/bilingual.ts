import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { driveRelativePathToSlug, relativePathFilename } from "@/lib/life-lab/slug";

/** Content language for Life Lab learning notes (UI stays English). */
export type LifeLabContentLanguage = "en" | "fa";

export const LIFE_LAB_READING_LANGUAGE_COOKIE = "planlet-life-lab-reading-language";
export const LIFE_LAB_READING_LANGUAGE_STORAGE_KEY =
  "planlet-life-lab-reading-language";

const LANGUAGE_ALIASES: Record<string, LifeLabContentLanguage> = {
  en: "en",
  eng: "en",
  english: "en",
  fa: "fa",
  fas: "fa",
  per: "fa",
  persian: "fa",
  farsi: "fa",
  فارسی: "fa",
};

/** Filename stem language suffix: `topic.en.md` / `topic.fa.md`. */
const LANGUAGE_FILENAME_SUFFIX = /\.(en|fa|eng|english|fas|per|persian|farsi)$/i;

export function normalizeLifeLabContentLanguage(
  value: string | null | undefined,
): LifeLabContentLanguage | null {
  if (!value?.trim()) {
    return null;
  }

  const key = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? null;
}

export function parseLanguageSuffixFromFilename(
  filename: string,
): LifeLabContentLanguage | null {
  const stem = filename.replace(/\.(md|txt|deck)$/i, "").trim();
  const match = stem.match(LANGUAGE_FILENAME_SUFFIX);

  if (!match?.[1]) {
    return null;
  }

  return normalizeLifeLabContentLanguage(match[1]);
}

/** Strip trailing `.en` / `.fa` (and aliases) from a path or filename stem. */
export function stripLanguageSuffixFromPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\.(md|txt|deck)$/i, "")
    .replace(LANGUAGE_FILENAME_SUFFIX, "");
}

export function resolveNoteContentLanguage(input: {
  metadata?: LifeLabNoteMetadata | null;
  relativePath?: string | null;
}): LifeLabContentLanguage | null {
  const fromMeta = normalizeLifeLabContentLanguage(input.metadata?.language);
  if (fromMeta) {
    return fromMeta;
  }

  const filename = relativePathFilename(input.relativePath ?? "");
  return parseLanguageSuffixFromFilename(filename);
}

export function resolveTranslationGroupId(input: {
  metadata?: LifeLabNoteMetadata | null;
  relativePath?: string | null;
  fileId?: string | null;
}): string | null {
  const fromMeta = input.metadata?.translation_group_id?.trim();
  if (fromMeta) {
    return fromMeta;
  }

  const path = input.relativePath?.trim();
  if (!path) {
    return null;
  }

  const stripped = stripLanguageSuffixFromPath(path);
  const originalStem = path.replace(/\.(md|txt|deck)$/i, "");

  // Only invent a group from path when a language suffix was present.
  if (stripped !== originalStem) {
    return `path:${stripped}`;
  }

  return null;
}

export function noteTranslationDedupeKey(note: {
  metadata?: LifeLabNoteMetadata | null;
  relativePath?: string | null;
  fileId?: string | null;
  slug?: string | null;
}): string | null {
  const groupId = resolveTranslationGroupId(note);
  return groupId ? `tg:${groupId}` : null;
}

export function contentLanguageLabel(language: LifeLabContentLanguage): string {
  return language === "fa" ? "فارسی" : "English";
}

export function contentLanguageSpeechLang(
  language: LifeLabContentLanguage,
): string {
  return language === "fa" ? "fa-IR" : "en-GB";
}

export function isPreferredReadingLanguage(
  value: string | null | undefined,
): value is LifeLabContentLanguage {
  return normalizeLifeLabContentLanguage(value) != null;
}

export function parsePreferredReadingLanguage(
  value: string | null | undefined,
): LifeLabContentLanguage {
  return normalizeLifeLabContentLanguage(value) ?? "en";
}

export type TranslationSibling = {
  language: LifeLabContentLanguage;
  slug: string;
  relativePath: string;
  fileId: string;
  title: string;
};

export function resolveAlternateLanguageNotePath(
  metadata: LifeLabNoteMetadata | null | undefined,
): string | null {
  const raw = metadata?.alternate_language_note?.trim();
  return raw || null;
}

/**
 * Among notes that share a translation group, pick the preferred language
 * version (default English). Falls back to the first available member.
 */
export function pickPreferredNoteInTranslationGroup<
  T extends {
    metadata?: LifeLabNoteMetadata | null;
    relativePath?: string | null;
    title?: string;
  },
>(
  notes: T[],
  preferred: LifeLabContentLanguage = "en",
): T | null {
  if (notes.length === 0) {
    return null;
  }

  const preferredMatch = notes.find(
    (note) => resolveNoteContentLanguage(note) === preferred,
  );
  if (preferredMatch) {
    return preferredMatch;
  }

  const english = notes.find(
    (note) => resolveNoteContentLanguage(note) === "en",
  );
  if (english) {
    return english;
  }

  return notes[0] ?? null;
}

/**
 * Find the other language file when names are `stem.en.md` / `stem.fa.md`
 * (works without frontmatter on the section index).
 */
export function findFilenameLanguageSiblings(
  currentRelativePath: string,
  candidates: Array<{
    relativePath: string;
    slug: string;
    fileId: string;
    title: string;
  }>,
): TranslationSibling[] {
  const currentLang = parseLanguageSuffixFromFilename(
    relativePathFilename(currentRelativePath),
  );
  if (!currentLang) {
    return [];
  }

  const currentStem = stripLanguageSuffixFromPath(currentRelativePath);
  const siblings: TranslationSibling[] = [];

  for (const candidate of candidates) {
    const language = parseLanguageSuffixFromFilename(
      relativePathFilename(candidate.relativePath),
    );
    if (!language) {
      continue;
    }
    if (stripLanguageSuffixFromPath(candidate.relativePath) !== currentStem) {
      continue;
    }
    siblings.push({
      language,
      slug: candidate.slug,
      relativePath: candidate.relativePath,
      fileId: candidate.fileId,
      title: candidate.title,
    });
  }

  return siblings;
}

export function collectTranslationSiblings(
  notes: Array<{
    metadata?: LifeLabNoteMetadata | null;
    relativePath: string;
    slug: string;
    fileId: string;
    title: string;
  }>,
  current: {
    metadata?: LifeLabNoteMetadata | null;
    relativePath: string;
    slug: string;
    fileId: string;
  },
): TranslationSibling[] {
  const groupId = resolveTranslationGroupId(current);
  const alternatePath = resolveAlternateLanguageNotePath(current.metadata);

  const siblings = new Map<LifeLabContentLanguage, TranslationSibling>();

  for (const note of notes) {
    const language = resolveNoteContentLanguage(note);
    if (!language) {
      continue;
    }

    const noteGroup = resolveTranslationGroupId(note);
    const pathMatchesAlternate =
      Boolean(alternatePath) &&
      (note.relativePath === alternatePath ||
        note.relativePath.endsWith(`/${alternatePath}`) ||
        note.slug === driveRelativePathToSlug(alternatePath!) ||
        relativePathFilename(note.relativePath) ===
          relativePathFilename(alternatePath!));

    const sameGroup = Boolean(groupId && noteGroup && groupId === noteGroup);
    const isSelf = note.fileId === current.fileId || note.slug === current.slug;

    if (!isSelf && !sameGroup && !pathMatchesAlternate) {
      continue;
    }

    siblings.set(language, {
      language,
      slug: note.slug,
      relativePath: note.relativePath,
      fileId: note.fileId,
      title: note.title,
    });
  }

  // Ensure current note is represented even without language metadata.
  const currentLanguage = resolveNoteContentLanguage(current) ?? "en";
  if (!siblings.has(currentLanguage)) {
    siblings.set(currentLanguage, {
      language: currentLanguage,
      slug: current.slug,
      relativePath: current.relativePath,
      fileId: current.fileId,
      title: current.slug,
    });
  }

  return ["en", "fa"]
    .map((language) => siblings.get(language as LifeLabContentLanguage))
    .filter((entry): entry is TranslationSibling => Boolean(entry));
}

export function bilingualAvailabilityLabel(
  languages: LifeLabContentLanguage[],
  sourceLanguage?: LifeLabContentLanguage | null,
): string | null {
  const unique = [...new Set(languages)];
  if (unique.length < 2) {
    return null;
  }

  const source =
    sourceLanguage === "fa"
      ? "Persian source"
      : sourceLanguage === "en"
        ? "English source"
        : null;
  const pair = "English + فارسی";
  return source ? `${source} · ${pair}` : pair;
}

export function noteHrefForLanguage(input: {
  sectionId: string;
  sibling: TranslationSibling;
  view?: string | null;
}): string {
  const base = `/life-lab/${input.sectionId}/${input.sibling.slug}`;
  if (input.view) {
    return `${base}?view=${encodeURIComponent(input.view)}`;
  }
  return base;
}

/** Study/archive identity shared across language versions of one learning item. */
export function buildTranslationAwareNoteIdentityPath(input: {
  metadata?: LifeLabNoteMetadata | null;
  relativePath?: string | null;
  slug: string;
}): string {
  const groupId = resolveTranslationGroupId(input);
  if (groupId) {
    return `tg:${groupId}`;
  }

  const path = input.relativePath?.trim() || input.slug;
  return stripLanguageSuffixFromPath(path);
}

export function summarizeTranslationGroupForCard(
  notes: LifeLabNoteSummary[],
  preferred: LifeLabContentLanguage = "en",
): {
  note: LifeLabNoteSummary;
  languages: LifeLabContentLanguage[];
  availabilityLabel: string | null;
} | null {
  if (notes.length === 0) {
    return null;
  }

  const languages = notes
    .map((note) => resolveNoteContentLanguage(note))
    .filter((language): language is LifeLabContentLanguage => Boolean(language));

  const note = pickPreferredNoteInTranslationGroup(notes, preferred);
  if (!note) {
    return null;
  }

  const sourceLanguage = normalizeLifeLabContentLanguage(
    note.metadata?.source_language,
  );

  return {
    note,
    languages: [...new Set(languages)],
    availabilityLabel: bilingualAvailabilityLabel(languages, sourceLanguage),
  };
}

/**
 * Collapse bilingual twins to one library card note (preferred language).
 * Attaches availability metadata onto the surviving note's metadata for UI chips.
 */
export function collapseNotesByTranslationGroup<
  T extends LifeLabNoteSummary,
>(notes: T[], preferred: LifeLabContentLanguage = "en"): T[] {
  const buckets = new Map<string, T[]>();
  const singles: T[] = [];

  for (const note of notes) {
    const key = noteTranslationDedupeKey(note);
    if (!key) {
      singles.push(note);
      continue;
    }
    const bucket = buckets.get(key) ?? [];
    bucket.push(note);
    buckets.set(key, bucket);
  }

  const collapsed: T[] = [...singles];

  for (const bucket of buckets.values()) {
    const summary = summarizeTranslationGroupForCard(bucket, preferred);
    if (!summary) {
      continue;
    }

    collapsed.push(
      Object.assign({}, summary.note, {
        bilingualLanguages: summary.languages,
        bilingualAvailabilityLabel: summary.availabilityLabel,
      }) as T,
    );
  }

  return collapsed;
}
