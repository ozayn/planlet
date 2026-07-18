import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { relativePathFilename } from "@/lib/life-lab/slug";
import { normalizeSearchText } from "@/lib/text-direction";

function metadataSearchValues(metadata: LifeLabNoteMetadata): string[] {
  const values: string[] = [];

  const scalarFields = [
    metadata.type,
    metadata.section,
    metadata.source,
    metadata.platform,
    metadata.show,
    metadata.episode_title,
    metadata.publication_date,
    metadata.duration,
    metadata.transcription_method,
    metadata.note_profile,
    metadata.input_source,
    metadata.language,
    metadata.channel,
    metadata.channelName,
    metadata.youtubeChannel,
    metadata.sourceChannel,
    metadata.playlist,
    metadata.study_status,
    metadata.date,
    metadata.term,
    metadata.display_title,
    metadata.meaning,
    metadata.category,
    metadata.summary,
    typeof metadata.episode === "string" || typeof metadata.episode === "number"
      ? String(metadata.episode)
      : undefined,
  ];

  values.push(...scalarFields.filter((value): value is string => Boolean(value)));

  for (const list of [
    metadata.topics,
    metadata.people,
    metadata.organizations,
    metadata.concepts,
    metadata.places,
    metadata.tags,
    metadata.related,
    metadata.aliases,
    metadata.source_notes,
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

  return normalizeSearchText(
    parts
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" "),
  );
}

export function noteMatchesSearch(
  note: LifeLabNoteSummary,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query.trim());

  if (!normalizedQuery) {
    return true;
  }

  return buildNoteSearchText(note).includes(normalizedQuery);
}
