import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  noteAddedDateValue,
  sortLifeLabNotes,
  type LifeLabSortKey,
} from "@/lib/life-lab/browse";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { resolveRawStandaloneChannelName } from "@/lib/life-lab/standalone-channel";
import { resolveLifeLabThumbnail } from "@/lib/life-lab/thumbnail";
import { noteLibraryDedupeKey } from "@/lib/life-lab/youtube-library";

export const MIN_SERIES_VIDEO_COUNT = 2;
export const STANDALONE_SERIES_PREVIEW_LIMIT = 5;
export const STANDALONE_INDIVIDUAL_VIDEO_PREVIEW_LIMIT = 4;

const SERIES_METADATA_FIELDS = [
  "series",
  "seriesName",
  "show",
  "program",
  "collection",
  "podcastName",
] as const;

const SERIES_COVER_FIELDS = [
  "seriesThumbnail",
  "series_thumbnail",
  "seriesCover",
  "series_cover",
  "seriesImage",
  "series_image",
] as const;

export type StandaloneVideoSeries = {
  id: string;
  slug: string;
  title: string;
  channel: string | null;
  videos: LifeLabNoteSummary[];
  thumbnail: ResolvedLifeLabNoteImage | null;
  latestModifiedTime: number;
  lastUpdatedLabel: string | null;
};

type SeriesCandidate = {
  key: string;
  title: string;
  source: "metadata" | "prefix";
};

function readMetadataString(
  metadata: LifeLabNoteMetadata | undefined,
  field: string,
): string | null {
  const value = metadata?.[field as keyof LifeLabNoteMetadata];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function normalizeSeriesKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function standaloneSeriesSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "series";
}

function resolveExplicitSeriesTitle(
  metadata?: LifeLabNoteMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }

  for (const field of SERIES_METADATA_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      return value;
    }
  }

  return null;
}

function resolveReliableTitlePrefix(title: string): string | null {
  const trimmed = title.trim();
  const match = trimmed.match(/^([^:]+):\s+\S/);

  if (!match?.[1]) {
    return null;
  }

  const prefix = match[1].trim();

  if (prefix.length < 2 || prefix.length > 48) {
    return null;
  }

  return prefix;
}

export function resolveSeriesCandidate(
  note: Pick<LifeLabNoteSummary, "title" | "metadata">,
): SeriesCandidate | null {
  const explicit = resolveExplicitSeriesTitle(note.metadata);

  if (explicit) {
    return {
      key: `meta:${normalizeSeriesKey(explicit)}`,
      title: explicit,
      source: "metadata",
    };
  }

  const prefix = resolveReliableTitlePrefix(note.title);

  if (!prefix) {
    return null;
  }

  return {
    key: `prefix:${normalizeSeriesKey(prefix)}`,
    title: prefix,
    source: "prefix",
  };
}

function resolveSeriesCoverUrl(
  metadata?: LifeLabNoteMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }

  for (const field of SERIES_COVER_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      return value;
    }
  }

  const image = metadata.thumbnailUrl ?? metadata.thumbnail_url;

  if (typeof image === "string" && image.trim()) {
    return image.trim();
  }

  return null;
}

export function resolveSeriesThumbnail(
  series: Pick<StandaloneVideoSeries, "videos">,
): ResolvedLifeLabNoteImage | null {
  for (const note of series.videos) {
    const coverUrl = resolveSeriesCoverUrl(note.metadata);

    if (coverUrl) {
      return {
        url: coverUrl,
        kind: "image",
        alt: `${note.title} series cover`,
      };
    }
  }

  const sortedByTitle = sortLifeLabNotes(series.videos, "title");

  for (const note of sortedByTitle) {
    const thumbnail = resolveLifeLabThumbnail(note);

    if (thumbnail) {
      return thumbnail;
    }
  }

  const sortedByRecent = sortLifeLabNotes(series.videos, "recent");

  for (const note of sortedByRecent) {
    const thumbnail = resolveLifeLabThumbnail(note);

    if (thumbnail) {
      return thumbnail;
    }
  }

  return null;
}

function canonicalSeriesTitle(
  notes: LifeLabNoteSummary[],
  fallbackTitle: string,
): string {
  const titleCounts = new Map<string, number>();

  for (const note of notes) {
    const explicit = resolveExplicitSeriesTitle(note.metadata);

    if (!explicit) {
      continue;
    }

    titleCounts.set(explicit, (titleCounts.get(explicit) ?? 0) + 1);
  }

  const winner = [...titleCounts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  })[0]?.[0];

  return winner ?? fallbackTitle;
}

function resolveSeriesChannel(notes: LifeLabNoteSummary[]): string | null {
  const counts = new Map<string, number>();

  for (const note of notes) {
    const channel = resolveRawStandaloneChannelName(note.metadata);

    if (!channel) {
      continue;
    }

    counts.set(channel, (counts.get(channel) ?? 0) + 1);
  }

  const winner = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  })[0]?.[0];

  return winner ?? null;
}

function buildStandaloneVideoSeries(input: {
  key: string;
  title: string;
  notes: LifeLabNoteSummary[];
  sort: LifeLabSortKey;
}): StandaloneVideoSeries {
  const videos = sortLifeLabNotes(input.notes, input.sort);
  const title = canonicalSeriesTitle(videos, input.title);
  const slug = standaloneSeriesSlug(title);
  const latest = videos.reduce(
    (max, note) => Math.max(max, noteAddedDateValue(note)),
    0,
  );
  const latestNote = sortLifeLabNotes(videos, "recent")[0] ?? null;

  return {
    id: input.key,
    slug,
    title,
    channel: resolveSeriesChannel(videos),
    videos,
    thumbnail: null,
    latestModifiedTime: latest,
    lastUpdatedLabel: latestNote?.dateLabel ?? latestNote?.modifiedAtLabel ?? null,
  };
}

export function groupStandaloneVideosIntoSeries(
  notes: LifeLabNoteSummary[],
  options: { sort?: LifeLabSortKey } = {},
): StandaloneVideoSeries[] {
  const sort = options.sort ?? "recent";
  const buckets = new Map<
    string,
    { title: string; notes: LifeLabNoteSummary[] }
  >();

  for (const note of notes) {
    const candidate = resolveSeriesCandidate(note);

    if (!candidate) {
      continue;
    }

    const bucket = buckets.get(candidate.key) ?? {
      title: candidate.title,
      notes: [],
    };

    bucket.notes.push(note);
    buckets.set(candidate.key, bucket);
  }

  const seriesGroups = [...buckets.entries()]
    .filter(([, bucket]) => bucket.notes.length >= MIN_SERIES_VIDEO_COUNT)
    .map(([key, bucket]) =>
      buildStandaloneVideoSeries({
        key,
        title: bucket.title,
        notes: bucket.notes,
        sort,
      }),
    )
    .map((series) => ({
      ...series,
      thumbnail: resolveSeriesThumbnail(series),
    }));

  return seriesGroups.sort((left, right) => {
    if (right.latestModifiedTime !== left.latestModifiedTime) {
      return right.latestModifiedTime - left.latestModifiedTime;
    }

    return left.title.localeCompare(right.title);
  });
}

export function collectSeriesNoteKeys(
  seriesGroups: StandaloneVideoSeries[],
): Set<string> {
  const keys = new Set<string>();

  for (const series of seriesGroups) {
    for (const note of series.videos) {
      keys.add(noteLibraryDedupeKey(note));
    }
  }

  return keys;
}

export function partitionStandaloneBySeries(
  notes: LifeLabNoteSummary[],
  options: { sort?: LifeLabSortKey } = {},
): {
  seriesGroups: StandaloneVideoSeries[];
  ungroupedNotes: LifeLabNoteSummary[];
  seriesNoteKeys: Set<string>;
} {
  const seriesGroups = groupStandaloneVideosIntoSeries(notes, options);
  const seriesNoteKeys = collectSeriesNoteKeys(seriesGroups);
  const ungroupedNotes = notes.filter(
    (note) => !seriesNoteKeys.has(noteLibraryDedupeKey(note)),
  );

  return {
    seriesGroups,
    ungroupedNotes,
    seriesNoteKeys,
  };
}

export function noteMatchesStandaloneSeriesFilter(
  note: LifeLabNoteSummary,
  seriesFilter: string,
  seriesGroups: StandaloneVideoSeries[],
): boolean {
  const normalizedFilter = seriesFilter.trim().toLowerCase();

  if (!normalizedFilter) {
    return true;
  }

  const series = seriesGroups.find(
    (group) =>
      group.slug === normalizedFilter ||
      normalizeSeriesKey(group.title) === normalizedFilter,
  );

  if (!series) {
    return false;
  }

  return seriesNoteKeysForGroup(series).has(noteLibraryDedupeKey(note));
}

function seriesNoteKeysForGroup(series: StandaloneVideoSeries): Set<string> {
  return new Set(series.videos.map((note) => noteLibraryDedupeKey(note)));
}

export function findStandaloneSeriesBySlug(
  seriesGroups: StandaloneVideoSeries[],
  seriesFilter: string,
): StandaloneVideoSeries | null {
  const normalizedFilter = seriesFilter.trim().toLowerCase();

  if (!normalizedFilter) {
    return null;
  }

  return (
    seriesGroups.find(
      (group) =>
        group.slug === normalizedFilter ||
        normalizeSeriesKey(group.title) === normalizedFilter,
    ) ?? null
  );
}
