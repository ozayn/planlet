import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { monthKeyLabel, noteMonthKey } from "@/lib/life-lab/browse";
import { resolveStudyStatusValue, studyStatusLabel } from "@/lib/life-lab/study-status";

export type LifeLabFilterKey =
  | "subfolder"
  | "tag"
  | "topic"
  | "source"
  | "channel"
  | "playlist"
  | "person"
  | "place"
  | "status"
  | "month";

export type LifeLabNoteFilters = Partial<Record<LifeLabFilterKey, string>>;

export type LifeLabFilterOption = {
  value: string;
  label: string;
};

export type LifeLabFilterOptions = Record<LifeLabFilterKey, LifeLabFilterOption[]>;

export const LIFE_LAB_MULTI_VALUE_FILTER_KEYS = [
  "tag",
  "topic",
  "person",
  "place",
] as const satisfies readonly LifeLabFilterKey[];

export type LifeLabMultiValueFilterKey =
  (typeof LIFE_LAB_MULTI_VALUE_FILTER_KEYS)[number];

export function parseLifeLabFilterValues(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function serializeLifeLabFilterValues(values: string[]): string | undefined {
  const unique = [...new Set(values.map((item) => item.trim()).filter(Boolean))];

  return unique.length > 0 ? unique.join(",") : undefined;
}

export function lifeLabFilterOptionLabel(
  options: LifeLabFilterOption[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

type MetadataFilterKey = Exclude<LifeLabFilterKey, "subfolder" | "status" | "month">;

const FILTER_METADATA_KEYS: Record<MetadataFilterKey, keyof LifeLabNoteMetadata> = {
  tag: "tags",
  topic: "topics",
  source: "source",
  channel: "channel",
  playlist: "playlist",
  person: "people",
  place: "places",
};

function uniqueSortedOptions(values: string[]): LifeLabFilterOption[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }));
}

function metadataValues(
  metadata: LifeLabNoteMetadata,
  key: MetadataFilterKey,
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
  const raw: Record<MetadataFilterKey | "subfolder", string[]> = {
    subfolder: [],
    tag: [],
    topic: [],
    source: [],
    channel: [],
    playlist: [],
    person: [],
    place: [],
  };
  const statuses = new Set<string>();
  const monthKeys = new Set<string>();

  for (const note of notes) {
    if (note.subfolderLabel) {
      raw.subfolder.push(note.subfolderLabel);
    }

    const metadata = note.metadata ?? {};

    for (const key of Object.keys(FILTER_METADATA_KEYS) as MetadataFilterKey[]) {
      raw[key].push(...metadataValues(metadata, key));
    }

    const status = resolveStudyStatusValue(metadata);

    if (status) {
      statuses.add(status);
    }

    const monthKey = noteMonthKey(note);

    if (monthKey) {
      monthKeys.add(monthKey);
    }
  }

  return {
    subfolder: uniqueSortedOptions(raw.subfolder),
    tag: uniqueSortedOptions(raw.tag),
    topic: uniqueSortedOptions(raw.topic),
    source: uniqueSortedOptions(raw.source),
    channel: uniqueSortedOptions(raw.channel),
    playlist: uniqueSortedOptions(raw.playlist),
    person: uniqueSortedOptions(raw.person),
    place: uniqueSortedOptions(raw.place),
    status: [...statuses]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({
        value,
        label: studyStatusLabel(value as Parameters<typeof studyStatusLabel>[0]),
      })),
    month: [...monthKeys]
      .sort((left, right) => right.localeCompare(left))
      .map((value) => ({ value, label: monthKeyLabel(value) })),
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

    if (key === "status") {
      if (resolveStudyStatusValue(note.metadata) !== value.toLowerCase()) {
        return false;
      }

      continue;
    }

    if (key === "month") {
      if (noteMonthKey(note) !== value) {
        return false;
      }

      continue;
    }

    const metadata = note.metadata ?? {};
    const values = metadataValues(metadata, key).map((item) =>
      item.toLowerCase(),
    );
    const selectedValues = (
      LIFE_LAB_MULTI_VALUE_FILTER_KEYS as readonly string[]
    ).includes(key)
      ? parseLifeLabFilterValues(value)
      : [value];

    const matches = selectedValues.some((selected) =>
      values.includes(selected.toLowerCase()),
    );

    if (!matches) {
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
