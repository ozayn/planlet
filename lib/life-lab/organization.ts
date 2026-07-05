import type { LifeLabNoteGroup, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  isReadmeSlug,
  parseDateFromFilename,
  relativePathFilename,
  slugToRelativePath,
} from "@/lib/life-lab/slug";

const README_GROUP_ID = "readme";
const REFERENCE_GROUP_ID = "reference";

export function noteGroupId(note: LifeLabNoteSummary): string {
  if (isReadmeSlug(note.slug)) {
    return README_GROUP_ID;
  }

  if (note.subfolderLabel) {
    return note.subfolderLabel.toLowerCase();
  }

  return REFERENCE_GROUP_ID;
}

export function noteGroupLabel(groupId: string): string {
  if (groupId === README_GROUP_ID) {
    return "Readme";
  }

  if (groupId === REFERENCE_GROUP_ID) {
    return "Reference";
  }

  return groupId.charAt(0).toUpperCase() + groupId.slice(1);
}

function noteSortValue(note: LifeLabNoteSummary): number {
  if (note.modifiedAt) {
    return new Date(note.modifiedAt).getTime();
  }

  const filename = relativePathFilename(slugToRelativePath(note.slug));
  const datePrefix = parseDateFromFilename(filename);

  if (datePrefix) {
    return new Date(`${datePrefix}T12:00:00Z`).getTime();
  }

  return 0;
}

function sortNotesInGroup(notes: LifeLabNoteSummary[]): LifeLabNoteSummary[] {
  return [...notes].sort((left, right) => {
    const leftSort = noteSortValue(left);
    const rightSort = noteSortValue(right);

    if (leftSort !== rightSort) {
      return rightSort - leftSort;
    }

    return left.title.localeCompare(right.title);
  });
}

function compareGroupIds(left: string, right: string): number {
  if (left === README_GROUP_ID) {
    return 1;
  }

  if (right === README_GROUP_ID) {
    return -1;
  }

  if (left === REFERENCE_GROUP_ID) {
    return 1;
  }

  if (right === REFERENCE_GROUP_ID) {
    return -1;
  }

  return left.localeCompare(right);
}

export function groupLifeLabNotes(
  notes: LifeLabNoteSummary[],
): LifeLabNoteGroup[] {
  const groups = new Map<string, LifeLabNoteSummary[]>();

  for (const note of notes) {
    const id = noteGroupId(note);
    const existing = groups.get(id) ?? [];
    existing.push(note);
    groups.set(id, existing);
  }

  return [...groups.keys()]
    .sort(compareGroupIds)
    .map((id) => ({
      id,
      label: noteGroupLabel(id),
      notes: sortNotesInGroup(groups.get(id) ?? []),
    }));
}
