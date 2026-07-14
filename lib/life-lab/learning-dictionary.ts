import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { markdownExcerpt } from "@/lib/life-lab/slug";
import {
  isReadmeRelativePath,
  isReadmeSlug,
  relativePathFilename,
  slugToRelativePath,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";

export const DICTIONARY_CATEGORY_IDS = [
  "concepts",
  "phrases",
  "idioms",
  "collocations",
  "words",
  "people",
  "places",
  "organizations",
  "films",
  "books",
  "art",
  "events",
] as const;

export type DictionaryCategoryId = (typeof DICTIONARY_CATEGORY_IDS)[number];

export const DICTIONARY_CATEGORY_LABELS: Record<DictionaryCategoryId, string> = {
  concepts: "Concepts",
  phrases: "Phrases",
  idioms: "Idioms",
  collocations: "Collocations",
  words: "Words",
  people: "People",
  places: "Places",
  organizations: "Organizations",
  films: "Films",
  books: "Books",
  art: "Art",
  events: "Events",
};

export const DICTIONARY_ENTRY_TYPE_IDS = [
  "phrase",
  "word",
  "concept",
  "person",
  "place",
  "organization",
  "artwork",
  "book",
  "film",
  "song",
  "event",
] as const;

export type DictionaryEntryTypeId = (typeof DICTIONARY_ENTRY_TYPE_IDS)[number];

export const DICTIONARY_LANGUAGE_IDS = ["english", "persian"] as const;

export type DictionaryLanguageId = (typeof DICTIONARY_LANGUAGE_IDS)[number];

const DICTIONARY_CATEGORY_SET = new Set<string>(DICTIONARY_CATEGORY_IDS);
const DICTIONARY_ENTRY_TYPE_SET = new Set<string>(DICTIONARY_ENTRY_TYPE_IDS);
const DICTIONARY_LANGUAGE_SET = new Set<string>(DICTIONARY_LANGUAGE_IDS);

const DICTIONARY_CATEGORY_ALIASES: Record<string, DictionaryCategoryId> = {
  concept: "concepts",
  concepts: "concepts",
  phrase: "phrases",
  phrases: "phrases",
  idiom: "idioms",
  idioms: "idioms",
  collocation: "collocations",
  collocations: "collocations",
  word: "words",
  words: "words",
  person: "people",
  people: "people",
  place: "places",
  places: "places",
  organization: "organizations",
  organisations: "organizations",
  organizations: "organizations",
  film: "films",
  films: "films",
  movie: "films",
  movies: "films",
  book: "books",
  books: "books",
  artwork: "art",
  artworks: "art",
  art: "art",
  event: "events",
  events: "events",
};

const ENTRY_TYPE_ALIASES: Record<string, DictionaryEntryTypeId> = {
  phrase: "phrase",
  phrases: "phrase",
  word: "word",
  words: "word",
  concept: "concept",
  concepts: "concept",
  person: "person",
  people: "person",
  place: "place",
  places: "place",
  organization: "organization",
  organisations: "organization",
  organizations: "organization",
  artwork: "artwork",
  art: "artwork",
  book: "book",
  books: "book",
  film: "film",
  films: "film",
  movie: "film",
  song: "song",
  songs: "song",
  event: "event",
  events: "event",
  "dictionary-entry": "concept",
};

const LANGUAGE_ALIASES: Record<string, DictionaryLanguageId> = {
  english: "english",
  en: "english",
  persian: "persian",
  farsi: "persian",
  fa: "persian",
};

export function isDictionaryCategoryId(value: string): value is DictionaryCategoryId {
  return DICTIONARY_CATEGORY_SET.has(value.trim().toLowerCase());
}

export function isDictionaryEntryTypeId(
  value: string,
): value is DictionaryEntryTypeId {
  return DICTIONARY_ENTRY_TYPE_SET.has(value.trim().toLowerCase());
}

export function isDictionaryLanguageId(
  value: string,
): value is DictionaryLanguageId {
  return DICTIONARY_LANGUAGE_SET.has(value.trim().toLowerCase());
}

function normalizeDictionaryCategory(value: string): DictionaryCategoryId | null {
  const normalized = value.trim().toLowerCase();
  const alias = DICTIONARY_CATEGORY_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  return isDictionaryCategoryId(normalized) ? normalized : null;
}

function normalizeDictionaryEntryType(value: string): DictionaryEntryTypeId | null {
  const normalized = value.trim().toLowerCase();

  return ENTRY_TYPE_ALIASES[normalized] ?? null;
}

function normalizeDictionaryLanguage(value: string): DictionaryLanguageId | null {
  const normalized = value.trim().toLowerCase();

  return LANGUAGE_ALIASES[normalized] ?? null;
}

export function dictionaryCategoryLabel(categoryId: string): string {
  const normalized = categoryId.trim().toLowerCase();

  if (isDictionaryCategoryId(normalized)) {
    return DICTIONARY_CATEGORY_LABELS[normalized];
  }

  return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

export function isDictionaryIndexRelativePath(relativePath: string): boolean {
  const filename = relativePathFilename(relativePath);

  return filename.replace(/\.md$/i, "").toLowerCase() === "index";
}

export function isDictionaryIndexSlug(slug: string): boolean {
  return isDictionaryIndexRelativePath(slugToRelativePath(slug));
}

export function isDictionaryReferenceNote(
  note: Pick<LifeLabNoteSummary, "slug" | "relativePath">,
): boolean {
  if (isReadmeSlug(note.slug)) {
    return true;
  }

  const relativePath = note.relativePath || slugToRelativePath(note.slug);

  return isDictionaryIndexRelativePath(relativePath);
}

function pathFolders(relativePath: string): string[] {
  const parts = relativePath.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return [];
  }

  return parts.slice(0, -1);
}

/**
 * Resolve a category folder from any depth of the relative path.
 * Prefer the deepest known category (e.g. english/phrases → phrases).
 */
export function resolveDictionaryCategoryFromPath(
  relativePath: string | undefined,
): DictionaryCategoryId | null {
  if (!relativePath) {
    return null;
  }

  const folders = pathFolders(relativePath);

  for (let index = folders.length - 1; index >= 0; index -= 1) {
    const category = normalizeDictionaryCategory(folders[index] ?? "");

    if (category) {
      return category;
    }
  }

  return null;
}

export function resolveDictionaryLanguageFromPath(
  relativePath: string | undefined,
): DictionaryLanguageId | null {
  if (!relativePath) {
    return null;
  }

  for (const folder of pathFolders(relativePath)) {
    const language = normalizeDictionaryLanguage(folder);

    if (language) {
      return language;
    }
  }

  return null;
}

export function isDictionaryEntryNote(input: {
  relativePath?: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  if (input.metadata?.type === "dictionary-entry") {
    return true;
  }

  if (
    input.metadata?.type &&
    normalizeDictionaryEntryType(input.metadata.type)
  ) {
    return true;
  }

  if (input.metadata?.section === "learning-dictionary") {
    return true;
  }

  const subfolder = input.subfolderLabel?.trim().toLowerCase();

  if (subfolder && normalizeDictionaryCategory(subfolder)) {
    return true;
  }

  if (subfolder && normalizeDictionaryLanguage(subfolder)) {
    return true;
  }

  const relativePath = input.relativePath;

  if (relativePath) {
    if (
      resolveDictionaryCategoryFromPath(relativePath) ||
      resolveDictionaryLanguageFromPath(relativePath)
    ) {
      return !isDictionaryReferenceNote({
        slug: "",
        relativePath,
      });
    }
  }

  return false;
}

export function resolveDictionaryCategory(input: {
  subfolderLabel?: string | null;
  relativePath?: string;
  metadata?: LifeLabNoteMetadata;
}): DictionaryCategoryId | null {
  const fromMetadata = input.metadata?.category
    ? normalizeDictionaryCategory(input.metadata.category)
    : null;

  if (fromMetadata) {
    return fromMetadata;
  }

  const fromType = input.metadata?.type
    ? normalizeDictionaryCategory(input.metadata.type)
    : null;

  if (fromType) {
    return fromType;
  }

  const fromPath = resolveDictionaryCategoryFromPath(input.relativePath);

  if (fromPath) {
    return fromPath;
  }

  const fromSubfolder = input.subfolderLabel
    ? normalizeDictionaryCategory(input.subfolderLabel)
    : null;

  if (fromSubfolder) {
    return fromSubfolder;
  }

  return null;
}

export function resolveDictionaryEntryType(input: {
  subfolderLabel?: string | null;
  relativePath?: string;
  metadata?: LifeLabNoteMetadata;
}): DictionaryEntryTypeId | null {
  const rawType = input.metadata?.type?.trim();

  if (rawType && rawType.toLowerCase() !== "dictionary-entry") {
    const fromType = normalizeDictionaryEntryType(rawType);

    if (fromType) {
      return fromType;
    }
  }

  const category = resolveDictionaryCategory(input);

  if (category) {
    return normalizeDictionaryEntryType(category);
  }

  if (rawType?.toLowerCase() === "dictionary-entry") {
    return "concept";
  }

  return null;
}

export function resolveDictionaryLanguage(input: {
  relativePath?: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
}): DictionaryLanguageId | null {
  if (input.metadata?.language) {
    const fromMetadata = normalizeDictionaryLanguage(input.metadata.language);

    if (fromMetadata) {
      return fromMetadata;
    }
  }

  const fromPath = resolveDictionaryLanguageFromPath(input.relativePath);

  if (fromPath) {
    return fromPath;
  }

  if (input.subfolderLabel) {
    return normalizeDictionaryLanguage(input.subfolderLabel);
  }

  return null;
}

export function dictionaryDisplayTitle(input: {
  title: string;
  metadata?: LifeLabNoteMetadata;
  body: string;
}): string {
  if (input.metadata?.display_title?.trim()) {
    return input.metadata.display_title.trim();
  }

  if (input.metadata?.term?.trim()) {
    return input.metadata.term.trim();
  }

  const heading = titleFromMarkdownHeading(input.body);

  if (heading) {
    return heading;
  }

  return input.title;
}

function extractLabeledDefinition(body: string): string | null {
  const match = body.match(
    /^\*\*(?:Definition|Meaning)\*\*\s*\n+([\s\S]*?)(?=\n##\s+|\n\*\*[A-Z][^*]+\*\*|\n---\s*$|$)/im,
  );

  return match?.[1]?.trim() ?? null;
}

export function extractDictionaryDefinition(body: string): string {
  const labeled = extractLabeledDefinition(body);

  if (labeled) {
    return markdownExcerpt(labeled, 180);
  }

  const withoutHeading = body.replace(/^#\s+.+\n+/, "").trim();
  const firstParagraph = withoutHeading
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block &&
        !block.startsWith("#") &&
        !/^\*\*[A-Za-z ]+\*\*\s*$/.test(block),
    );

  return firstParagraph
    ? markdownExcerpt(firstParagraph, 180)
    : markdownExcerpt(withoutHeading, 180);
}

export function classifyDictionaryNoteGroup(
  note: LifeLabNoteSummary,
): string {
  if (isReadmeRelativePath(note.relativePath || slugToRelativePath(note.slug))) {
    return "about";
  }

  if (isDictionaryReferenceNote(note)) {
    return "reference";
  }

  const category = resolveDictionaryCategory({
    ...note,
    relativePath: note.relativePath,
  });

  if (category) {
    return category;
  }

  const language = resolveDictionaryLanguage(note);

  if (language) {
    return language;
  }

  // Preserve unknown nested folders as group ids so new folders appear automatically.
  const folders = pathFolders(note.relativePath || slugToRelativePath(note.slug));

  if (folders.length > 0) {
    return folders[folders.length - 1]!.toLowerCase();
  }

  return "reference";
}

export function compareDictionaryGroupIds(left: string, right: string): number {
  const leftIndex = DICTIONARY_CATEGORY_IDS.indexOf(
    left as DictionaryCategoryId,
  );
  const rightIndex = DICTIONARY_CATEGORY_IDS.indexOf(
    right as DictionaryCategoryId,
  );
  const leftPrimary = leftIndex !== -1;
  const rightPrimary = rightIndex !== -1;

  if (leftPrimary && rightPrimary) {
    return leftIndex - rightIndex;
  }

  if (leftPrimary !== rightPrimary) {
    return leftPrimary ? -1 : 1;
  }

  if (left === "reference") {
    return -1;
  }

  if (right === "reference") {
    return 1;
  }

  if (left === "about") {
    return 1;
  }

  if (right === "about") {
    return -1;
  }

  return left.localeCompare(right);
}
