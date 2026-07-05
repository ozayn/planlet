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
  "people",
  "places",
] as const;

export type DictionaryCategoryId = (typeof DICTIONARY_CATEGORY_IDS)[number];

export const DICTIONARY_CATEGORY_LABELS: Record<DictionaryCategoryId, string> = {
  concepts: "Concepts",
  phrases: "Phrases",
  people: "People",
  places: "Places",
};

const DICTIONARY_CATEGORY_SET = new Set<string>(DICTIONARY_CATEGORY_IDS);

const DICTIONARY_CATEGORY_ALIASES: Record<string, DictionaryCategoryId> = {
  concept: "concepts",
  concepts: "concepts",
  phrase: "phrases",
  phrases: "phrases",
  person: "people",
  people: "people",
  place: "places",
  places: "places",
};

export function isDictionaryCategoryId(value: string): value is DictionaryCategoryId {
  return DICTIONARY_CATEGORY_SET.has(value.trim().toLowerCase());
}

function normalizeDictionaryCategory(value: string): DictionaryCategoryId | null {
  const normalized = value.trim().toLowerCase();
  const alias = DICTIONARY_CATEGORY_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  return isDictionaryCategoryId(normalized) ? normalized : null;
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

export function isDictionaryEntryNote(input: {
  relativePath?: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  if (input.metadata?.type === "dictionary-entry") {
    return true;
  }

  if (input.metadata?.section === "learning-dictionary") {
    return true;
  }

  const subfolder = input.subfolderLabel?.trim().toLowerCase();

  if (subfolder && normalizeDictionaryCategory(subfolder)) {
    return true;
  }

  const relativePath = input.relativePath;

  if (relativePath) {
    const parts = relativePath.split("/").filter(Boolean);

    if (parts.length >= 2) {
      const category = normalizeDictionaryCategory(parts[0] ?? "");

      if (category) {
        return !isDictionaryReferenceNote({
          slug: "",
          relativePath,
        });
      }
    }
  }

  return false;
}

export function resolveDictionaryCategory(input: {
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
}): DictionaryCategoryId | null {
  const fromMetadata = input.metadata?.category
    ? normalizeDictionaryCategory(input.metadata.category)
    : null;

  if (fromMetadata) {
    return fromMetadata;
  }

  const fromSubfolder = input.subfolderLabel
    ? normalizeDictionaryCategory(input.subfolderLabel)
    : null;

  if (fromSubfolder) {
    return fromSubfolder;
  }

  return null;
}

export function dictionaryDisplayTitle(input: {
  title: string;
  metadata?: LifeLabNoteMetadata;
  body: string;
}): string {
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
    /^\*\*Definition\*\*\s*\n+([\s\S]*?)(?=\n##\s+|\n\*\*[A-Z][^*]+\*\*|\n---\s*$|$)/im,
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

  const category = resolveDictionaryCategory(note);

  if (category) {
    return category;
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
