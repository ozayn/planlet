import type { LifeLabFilterKey, LifeLabFilterOptions } from "@/lib/life-lab/filters";
import { isInternalPlaylistTitle } from "@/lib/life-lab/youtube-browse";

export const LIFE_LAB_PRIMARY_FILTER_KEYS = [
  "status",
  "playlist",
  "channel",
  "month",
  "source",
] as const satisfies readonly LifeLabFilterKey[];

export const LIFE_LAB_SECONDARY_FILTER_KEYS = [
  "tag",
  "topic",
  "person",
  "place",
] as const satisfies readonly LifeLabFilterKey[];

export const LIFE_LAB_SEARCHABLE_FILTER_KEYS = [
  "tag",
  "topic",
  "person",
  "place",
  "playlist",
  "channel",
] as const satisfies readonly LifeLabFilterKey[];

export const LIFE_LAB_HIDDEN_SUBFOLDER_FILTER_VALUES = new Set([
  "archive",
  "playlists",
  "videos",
]);

export const LIFE_LAB_FILTER_LABELS: Record<LifeLabFilterKey, string> = {
  subfolder: "Folder",
  tag: "Tag",
  topic: "Topic",
  source: "Source",
  channel: "Channel",
  playlist: "Playlist",
  person: "Person",
  place: "Place",
  status: "Study status",
  month: "Month",
};

export function sanitizeLifeLabFilterOptions(
  options: LifeLabFilterOptions,
  input: { includeFolderFilter?: boolean } = {},
): LifeLabFilterOptions {
  const includeFolderFilter = input.includeFolderFilter ?? false;

  return {
    ...options,
    playlist: options.playlist.filter(
      (option) => !isInternalPlaylistTitle(option.value),
    ),
    subfolder: includeFolderFilter
      ? options.subfolder.filter(
          (option) =>
            !LIFE_LAB_HIDDEN_SUBFOLDER_FILTER_VALUES.has(
              option.value.toLowerCase(),
            ),
        )
      : [],
  };
}

export function countActiveLifeLabFilters(
  filters: Partial<Record<LifeLabFilterKey, string>>,
): number {
  return Object.values(filters).filter((value) => Boolean(value?.trim())).length;
}
