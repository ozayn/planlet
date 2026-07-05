import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { relativePathFilename } from "@/lib/life-lab/slug";

function metadataSearchValues(metadata: LifeLabNoteMetadata): string[] {
  const values: string[] = [];

  const scalarFields = [
    metadata.type,
    metadata.section,
    metadata.source,
    metadata.channel,
    metadata.playlist,
    metadata.study_status,
    typeof metadata.episode === "string" || typeof metadata.episode === "number"
      ? String(metadata.episode)
      : undefined,
  ];

  values.push(...scalarFields.filter((value): value is string => Boolean(value)));

  for (const list of [
    metadata.topics,
    metadata.people,
    metadata.places,
    metadata.tags,
  ]) {
    if (list) {
      values.push(...list);
    }
  }

  return values;
}

export function buildNoteSearchText(
  note: Pick<
    LifeLabNoteSummary,
    "title" | "slug" | "relativePath" | "subfolderLabel" | "metadata" | "searchText"
  >,
): string {
  const filename = relativePathFilename(note.relativePath || `${note.slug}.md`);
  const parts = [
    note.title,
    filename,
    note.slug,
    note.relativePath,
    note.subfolderLabel,
    note.searchText,
    ...metadataSearchValues(note.metadata ?? {}),
  ];

  return parts
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();
}

export function noteMatchesSearch(
  note: LifeLabNoteSummary,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return buildNoteSearchText(note).includes(normalizedQuery);
}
