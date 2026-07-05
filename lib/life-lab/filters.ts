import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";

export type LifeLabFilterKey =
  | "subfolder"
  | "tag"
  | "topic"
  | "source"
  | "channel"
  | "playlist"
  | "person"
  | "place";

export type LifeLabNoteFilters = Partial<Record<LifeLabFilterKey, string>>;

export type LifeLabFilterOptions = Record<LifeLabFilterKey, string[]>;

const FILTER_METADATA_KEYS: Record<
  Exclude<LifeLabFilterKey, "subfolder">,
  keyof LifeLabNoteMetadata
> = {
  tag: "tags",
  topic: "topics",
  source: "source",
  channel: "channel",
  playlist: "playlist",
  person: "people",
  place: "places",
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function metadataValues(
  metadata: LifeLabNoteMetadata,
  key: Exclude<LifeLabFilterKey, "subfolder">,
): string[] {
  const metadataKey = FILTER_METADATA_KEYS[key];
  const value = metadata[metadataKey];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

export function collectLifeLabFilterOptions(
  notes: LifeLabNoteSummary[],
): LifeLabFilterOptions {
  const options: LifeLabFilterOptions = {
    subfolder: [],
    tag: [],
    topic: [],
    source: [],
    channel: [],
    playlist: [],
    person: [],
    place: [],
  };

  for (const note of notes) {
    if (note.subfolderLabel) {
      options.subfolder.push(note.subfolderLabel);
    }

    const metadata = note.metadata ?? {};

    for (const key of Object.keys(FILTER_METADATA_KEYS) as Array<
      Exclude<LifeLabFilterKey, "subfolder">
    >) {
      options[key].push(...metadataValues(metadata, key));
    }
  }

  return {
    subfolder: uniqueSorted(options.subfolder),
    tag: uniqueSorted(options.tag),
    topic: uniqueSorted(options.topic),
    source: uniqueSorted(options.source),
    channel: uniqueSorted(options.channel),
    playlist: uniqueSorted(options.playlist),
    person: uniqueSorted(options.person),
    place: uniqueSorted(options.place),
  };
}

export function noteMatchesFilters(
  note: LifeLabNoteSummary,
  filters: LifeLabNoteFilters,
): boolean {
  for (const [rawKey, rawValue] of Object.entries(filters)) {
    const key = rawKey as LifeLabFilterKey;
    const value = rawValue?.trim();

    if (!value) {
      continue;
    }

    if (key === "subfolder") {
      if ((note.subfolderLabel ?? "").toLowerCase() !== value.toLowerCase()) {
        return false;
      }

      continue;
    }

    const metadata = note.metadata ?? {};
    const values = metadataValues(metadata, key).map((item) =>
      item.toLowerCase(),
    );

    if (!values.includes(value.toLowerCase())) {
      return false;
    }
  }

  return true;
}

export function filterLifeLabNotes(
  notes: LifeLabNoteSummary[],
  filters: LifeLabNoteFilters,
): LifeLabNoteSummary[] {
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => Boolean(value?.trim())),
  ) as LifeLabNoteFilters;

  if (Object.keys(activeFilters).length === 0) {
    return notes;
  }

  return notes.filter((note) => noteMatchesFilters(note, activeFilters));
}
