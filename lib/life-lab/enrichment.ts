import type { LifeLabFlashcard, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import {
  extractFlashcardsFromMarkdown,
  noteHasFlashcards,
} from "@/lib/life-lab/flashcards";
import {
  hasLifeLabMetadata,
  parseLifeLabFrontmatter,
} from "@/lib/life-lab/frontmatter";
import {
  formatDateLabelFromFilename,
  markdownExcerpt,
  relativePathFilename,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";
import {
  extractReadingBriefPreview,
  isReadingBriefNote,
} from "@/lib/life-lab/reading-briefs";
import {
  dictionaryDisplayTitle,
  extractDictionaryDefinition,
  isDictionaryEntryNote,
} from "@/lib/life-lab/learning-dictionary";
import type { DriveCredentials } from "@/lib/life-lab/google-drive";
import { downloadDriveFile } from "@/lib/life-lab/google-drive";

export type LifeLabSectionNoteRecord = {
  slug: string;
  title: string;
  excerpt: string;
  modifiedAt: string | null;
  modifiedAtLabel: string | null;
  dateLabel: string | null;
  subfolderLabel: string | null;
  fileId: string;
  relativePath: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  metadata?: LifeLabNoteMetadata;
  searchText?: string;
  hasFlashcards?: boolean;
  flashcardCount?: number;
  flashcards?: LifeLabFlashcard[];
};

function formatDateLabelFromIso(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function buildBodySearchText(body: string): string {
  return markdownExcerpt(body, 4000);
}

export function processLifeLabNoteContent(
  record: LifeLabSectionNoteRecord,
  rawContent: string,
): LifeLabSectionNoteRecord {
  const { metadata, body } = parseLifeLabFrontmatter(rawContent);
  const flashcards = extractFlashcardsFromMarkdown(body);
  const headingTitle = titleFromMarkdownHeading(body);
  const filename = relativePathFilename(record.relativePath);
  const normalizedMetadata = hasLifeLabMetadata(metadata) ? metadata : undefined;
  const isReadingBrief = isReadingBriefNote({
    relativePath: record.relativePath,
    subfolderLabel: record.subfolderLabel,
    metadata: normalizedMetadata,
  });
  const isDictionaryEntry = isDictionaryEntryNote({
    relativePath: record.relativePath,
    subfolderLabel: record.subfolderLabel,
    metadata: normalizedMetadata,
  });
  const excerpt = isReadingBrief
    ? extractReadingBriefPreview(body)
    : isDictionaryEntry
      ? extractDictionaryDefinition(body)
      : markdownExcerpt(body);
  const title = isDictionaryEntry
    ? dictionaryDisplayTitle({
        title: headingTitle ?? record.title,
        metadata: normalizedMetadata,
        body,
      })
    : (headingTitle ?? record.title);

  return {
    ...record,
    title,
    excerpt,
    dateLabel:
      (normalizedMetadata?.date
        ? formatDateLabelFromIso(normalizedMetadata.date)
        : null) ?? record.dateLabel ?? formatDateLabelFromFilename(filename),
    metadata: normalizedMetadata,
    searchText: buildBodySearchText(body),
    hasFlashcards: noteHasFlashcards(metadata, body),
    flashcardCount: flashcards.length,
    flashcards,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

export async function enrichSectionNoteRecords(
  credentials: DriveCredentials,
  records: LifeLabSectionNoteRecord[],
): Promise<LifeLabSectionNoteRecord[]> {
  return mapWithConcurrency(
    records,
    async (record) => {
      try {
        const rawContent = await downloadDriveFile(credentials, record.fileId);

        return processLifeLabNoteContent(record, rawContent);
      } catch {
        return record;
      }
    },
    8,
  );
}
