import type { LifeLabPlaylistCard } from "@/lib/life-lab/section-view";
import type { StandaloneChannelGroup } from "@/lib/life-lab/standalone-channel";
import type { StandaloneVideoSeries } from "@/lib/life-lab/standalone-series";

export function formatCount(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export type ContentCountType =
  | "note"
  | "deck"
  | "card"
  | "podcast"
  | "item";

const CONTENT_COUNT_NOUNS: Record<
  ContentCountType,
  { singular: string; plural: string }
> = {
  note: { singular: "note", plural: "notes" },
  deck: { singular: "deck", plural: "decks" },
  card: { singular: "card", plural: "cards" },
  podcast: { singular: "podcast", plural: "podcasts" },
  item: { singular: "item", plural: "items" },
};

/** Canonical section/card metadata count line (e.g. "1 note", "2 decks"). */
export function formatContentCount(
  count: number,
  type: ContentCountType,
): string {
  const nouns = CONTENT_COUNT_NOUNS[type];
  return formatCount(count, nouns.singular, nouns.plural);
}

export function formatSectionContentMeta(
  count: number,
  type: ContentCountType,
): string {
  if (count <= 0) {
    return "No items yet";
  }

  return formatContentCount(count, type);
}

export function normalizeAccidentalAllCapsTitle(title: string): string {
  const trimmed = title.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (/[^\x00-\x7F]/.test(trimmed)) {
    return trimmed;
  }

  const letters = trimmed.replace(/[^A-Za-z]/g, "");

  if (letters.length < 4 || letters !== letters.toUpperCase()) {
    return trimmed;
  }

  return trimmed
    .toLowerCase()
    .replace(/(^|[\s\-/])(\S)/g, (_, prefix: string, char: string) => {
      return `${prefix}${char.toUpperCase()}`;
    });
}

export function formatPlaylistCardProgress(excerpt: string): string | null {
  const trimmed = excerpt.trim();

  if (!trimmed) {
    return null;
  }

  const processedMatch = trimmed.match(/(\d+)\s+processed/i);
  const pendingMatch = trimmed.match(/(\d+)\s+pending/i);
  const processed = processedMatch
    ? Number.parseInt(processedMatch[1] ?? "0", 10)
    : 0;
  const pending = pendingMatch
    ? Number.parseInt(pendingMatch[1] ?? "0", 10)
    : 0;

  if (pending <= 0) {
    return null;
  }

  const parts: string[] = [];

  if (processed > 0) {
    parts.push(`${processed} processed`);
  }

  parts.push(`${pending} pending`);

  return parts.join(" · ");
}

export function formatUpdatedLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) {
    return null;
  }

  return `Updated ${label.trim()}`;
}

export type CollectionRowMetadata = {
  primaryMeta: string | null;
  secondaryMeta: string | null;
};

export function formatSeriesCollectionMetadata(
  series: Pick<StandaloneVideoSeries, "channel" | "videos" | "lastUpdatedLabel">,
): CollectionRowMetadata {
  const parts: string[] = [];

  if (series.channel) {
    parts.push(series.channel);
  }

  parts.push(formatCount(series.videos.length, "video", "videos"));

  return {
    primaryMeta: parts.join(" · "),
    secondaryMeta: formatUpdatedLabel(series.lastUpdatedLabel),
  };
}

export function formatChannelCollectionMetadata(
  group: Pick<StandaloneChannelGroup, "totalCount" | "notes"> & {
    lastUpdatedLabel?: string | null;
  },
): CollectionRowMetadata {
  const lastUpdatedLabel =
    group.lastUpdatedLabel ??
    group.notes[0]?.dateLabel ??
    group.notes[0]?.modifiedAtLabel ??
    null;

  return {
    primaryMeta: formatCount(group.totalCount, "video", "videos"),
    secondaryMeta: formatUpdatedLabel(lastUpdatedLabel),
  };
}

export function formatPlaylistCollectionMetadata(
  item: Pick<
    LifeLabPlaylistCard,
    "channelLabel" | "noteCount" | "progressSummary" | "lastUpdatedLabel"
  >,
): CollectionRowMetadata {
  const parts: string[] = [];

  if (item.channelLabel) {
    parts.push(item.channelLabel);
  }

  if (item.noteCount != null && item.noteCount >= 0) {
    parts.push(formatCount(item.noteCount, "note", "notes"));
  }

  if (item.progressSummary) {
    return {
      primaryMeta: parts.join(" · ") || null,
      secondaryMeta: item.progressSummary,
    };
  }

  return {
    primaryMeta: parts.join(" · ") || null,
    secondaryMeta: formatUpdatedLabel(item.lastUpdatedLabel),
  };
}

/** Semantic link rows use a single top-level anchor with no nested actions. */
export const LIFE_LAB_COLLECTION_ROW_LINK_ROLE = "link" as const;
