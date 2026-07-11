import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  compareLifeLabNotes,
  noteAddedDateValue,
  noteContentDateValue,
  sortLifeLabNotes,
  type LifeLabSortKey,
} from "@/lib/life-lab/browse";
import { noteLibraryDedupeKey } from "@/lib/life-lab/youtube-library";

export const STANDALONE_OTHER_CHANNEL_LABEL = "Other";
export const STANDALONE_OTHER_CHANNEL_SLUG = "other";

export const STANDALONE_CHANNEL_VIDEO_PREVIEW_LIMIT = 4;
export const STANDALONE_CHANNEL_GROUP_PREVIEW_LIMIT = 5;

/** Exact label aliases only — never fuzzy title matching. */
const EXPLICIT_CHANNEL_LABEL_ALIASES: Record<string, string> = {
  "school of life": "The School of Life",
};

export type ResolvedStandaloneChannel = {
  label: string;
  slug: string;
  channelId: string | null;
};

export type StandaloneChannelGroup = {
  label: string;
  slug: string;
  channelId: string | null;
  notes: LifeLabNoteSummary[];
  previewNotes: LifeLabNoteSummary[];
  totalCount: number;
  lastUpdatedValue: number;
};

const CHANNEL_NAME_FIELDS = [
  "channel",
  "channelName",
  "youtubeChannel",
  "sourceChannel",
] as const;

const CHANNEL_ID_FIELDS = [
  "channelId",
  "youtubeChannelId",
  "channel_id",
  "youtube_channel_id",
] as const;

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

export function resolveRawStandaloneChannelName(
  metadata?: LifeLabNoteMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }

  for (const field of CHANNEL_NAME_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      return value;
    }
  }

  return null;
}

export function resolveStandaloneChannelId(
  metadata?: LifeLabNoteMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }

  for (const field of CHANNEL_ID_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeAliasKey(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

export function standaloneChannelSlug(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || STANDALONE_OTHER_CHANNEL_SLUG;
}

function applyExplicitLabelAlias(label: string): string {
  return EXPLICIT_CHANNEL_LABEL_ALIASES[normalizeAliasKey(label)] ?? label.trim();
}

export function buildCanonicalChannelLabelMap(
  notes: LifeLabNoteSummary[],
): Map<string, string> {
  const labelCounts = new Map<string, Map<string, number>>();

  for (const note of notes) {
    const channelId = resolveStandaloneChannelId(note.metadata);
    const rawLabel = resolveRawStandaloneChannelName(note.metadata);

    if (!channelId || !rawLabel) {
      continue;
    }

    const counts = labelCounts.get(channelId) ?? new Map<string, number>();
    const normalized = applyExplicitLabelAlias(rawLabel);

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    labelCounts.set(channelId, counts);
  }

  const canonical = new Map<string, string>();

  for (const [channelId, counts] of labelCounts) {
    const winner = [...counts.entries()].sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })[0]?.[0];

    if (winner) {
      canonical.set(channelId, winner);
    }
  }

  return canonical;
}

export function resolveStandaloneChannel(
  note: Pick<LifeLabNoteSummary, "metadata">,
  canonicalLabels: Map<string, string> = new Map(),
): ResolvedStandaloneChannel {
  const channelId = resolveStandaloneChannelId(note.metadata);
  const rawLabel = resolveRawStandaloneChannelName(note.metadata);

  if (channelId) {
    const label =
      canonicalLabels.get(channelId) ??
      (rawLabel ? applyExplicitLabelAlias(rawLabel) : STANDALONE_OTHER_CHANNEL_LABEL);

    return {
      label,
      slug: standaloneChannelSlug(label),
      channelId,
    };
  }

  if (rawLabel) {
    const label = applyExplicitLabelAlias(rawLabel);

    return {
      label,
      slug: standaloneChannelSlug(label),
      channelId: null,
    };
  }

  return {
    label: STANDALONE_OTHER_CHANNEL_LABEL,
    slug: STANDALONE_OTHER_CHANNEL_SLUG,
    channelId: null,
  };
}

export function standaloneChannelGroupKey(
  channel: ResolvedStandaloneChannel,
): string {
  return channel.channelId ?? `label:${normalizeAliasKey(channel.label)}`;
}

function channelGroupSortValue(
  notes: LifeLabNoteSummary[],
  sort: LifeLabSortKey,
): number {
  if (notes.length === 0) {
    return 0;
  }

  if (sort === "title") {
    return 0;
  }

  const sorted = sortLifeLabNotes(notes, sort);
  const top = sorted[0];

  if (!top) {
    return 0;
  }

  return sort === "recent" || sort === "newest"
    ? noteAddedDateValue(top)
    : noteContentDateValue(top);
}

function compareChannelGroups(
  left: StandaloneChannelGroup,
  right: StandaloneChannelGroup,
  sort: LifeLabSortKey,
): number {
  if (sort === "title") {
    return left.label.localeCompare(right.label);
  }

  const delta = right.lastUpdatedValue - left.lastUpdatedValue;

  if (delta !== 0) {
    return delta;
  }

  return left.label.localeCompare(right.label);
}

export function groupStandaloneVideosByChannel(input: {
  notes: LifeLabNoteSummary[];
  sort: LifeLabSortKey;
  excludeKeys?: Set<string>;
  videosPerChannelPreview?: number;
}): StandaloneChannelGroup[] {
  const {
    notes,
    sort,
    excludeKeys = new Set<string>(),
    videosPerChannelPreview = STANDALONE_CHANNEL_VIDEO_PREVIEW_LIMIT,
  } = input;

  const canonicalLabels = buildCanonicalChannelLabelMap(notes);
  const groups = new Map<string, LifeLabNoteSummary[]>();

  for (const note of notes) {
    const channel = resolveStandaloneChannel(note, canonicalLabels);
    const key = standaloneChannelGroupKey(channel);
    const bucket = groups.get(key) ?? [];

    bucket.push(note);
    groups.set(key, bucket);
  }

  const channelGroups: StandaloneChannelGroup[] = [];

  for (const bucket of groups.values()) {
    const sortedNotes = sortLifeLabNotes(bucket, sort);
    const channel = resolveStandaloneChannel(sortedNotes[0]!, canonicalLabels);
    const visibleNotes = sortedNotes.filter(
      (note) => !excludeKeys.has(noteLibraryDedupeKey(note)),
    );

    channelGroups.push({
      label: channel.label,
      slug: channel.slug,
      channelId: channel.channelId,
      notes: sortedNotes,
      previewNotes: visibleNotes.slice(0, videosPerChannelPreview),
      totalCount: sortedNotes.length,
      lastUpdatedValue: channelGroupSortValue(sortedNotes, sort),
    });
  }

  return channelGroups.sort((left, right) =>
    compareChannelGroups(left, right, sort),
  );
}

export function noteMatchesStandaloneChannelFilter(
  note: LifeLabNoteSummary,
  channelFilter: string,
  canonicalLabels: Map<string, string> = new Map(),
): boolean {
  const normalizedFilter = channelFilter.trim().toLowerCase();

  if (!normalizedFilter) {
    return true;
  }

  const channel = resolveStandaloneChannel(note, canonicalLabels);

  return (
    channel.slug === normalizedFilter ||
    normalizeAliasKey(channel.label) === normalizedFilter
  );
}

export function compareStandaloneChannelNotes(
  left: LifeLabNoteSummary,
  right: LifeLabNoteSummary,
  sort: LifeLabSortKey,
): number {
  return compareLifeLabNotes(left, right, sort);
}
