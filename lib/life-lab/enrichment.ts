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
import {
  formatPlaylistProcessingSummary,
  isPlaylistIndexNote,
  parsePlaylistIndexNote,
} from "@/lib/life-lab/playlist-index";
import {
  extractFilmLabPreview,
  filmLabDisplayTitle,
  isFilmLabNote,
} from "@/lib/life-lab/film-lab";
import {
  extractSourceUrlFromBody,
  extractSourceUrlFromMetadata,
} from "@/lib/life-lab/source-url";
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
  let mergedMetadata = normalizedMetadata;

  if (!extractSourceUrlFromMetadata(normalizedMetadata)) {
    const sourceFromBody = extractSourceUrlFromBody(body);

    if (sourceFromBody) {
      mergedMetadata = {
        ...(normalizedMetadata ?? {}),
        source_url: sourceFromBody,
        video_url: sourceFromBody,
      };
    }
  }
  const isReadingBrief = isReadingBriefNote({
    relativePath: record.relativePath,
    subfolderLabel: record.subfolderLabel,
    metadata: mergedMetadata,
  });
  const isDictionaryEntry = isDictionaryEntryNote({
    relativePath: record.relativePath,
    subfolderLabel: record.subfolderLabel,
    metadata: mergedMetadata,
  });
  const isFilmLab = isFilmLabNote({
    relativePath: record.relativePath,
    subfolderLabel: record.subfolderLabel,
    metadata: mergedMetadata,
  });
  const isPlaylistIndex = isPlaylistIndexNote({
    sectionId: "youtube-learning",
    relativePath: record.relativePath,
    subfolderLabel: record.subfolderLabel,
    metadata: mergedMetadata,
    content: body,
  });
  let excerpt = isReadingBrief
    ? extractReadingBriefPreview(body)
    : isDictionaryEntry
      ? extractDictionaryDefinition(body)
      : isFilmLab
        ? extractFilmLabPreview(body, mergedMetadata)
        : markdownExcerpt(body);

  if (isPlaylistIndex) {
    const playlistDisplay = parsePlaylistIndexNote({
      ...record,
      sectionId: "youtube-learning",
      sectionLabel: "YouTube learning",
      content: body,
      metadata: mergedMetadata,
    });

    if (playlistDisplay.parseSucceeded) {
      excerpt = formatPlaylistProcessingSummary(playlistDisplay.summary);
    }
  }
  const title = isDictionaryEntry
    ? dictionaryDisplayTitle({
        title: headingTitle ?? record.title,
        metadata: mergedMetadata,
        body,
      })
    : isFilmLab
      ? filmLabDisplayTitle({
          title: headingTitle ?? record.title,
          metadata: mergedMetadata,
          body,
        })
      : (headingTitle ?? record.title);

  return {
    ...record,
    title,
    excerpt,
    dateLabel:
      (mergedMetadata?.date
        ? formatDateLabelFromIso(mergedMetadata.date)
        : null) ?? record.dateLabel ?? formatDateLabelFromFilename(filename),
    metadata: hasLifeLabMetadata(mergedMetadata ?? {}) ? mergedMetadata : undefined,
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
