import type { LifeLabNoteGroup, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  isReadmeSlug,
  parseDateFromFilename,
  relativePathFilename,
  slugToRelativePath,
} from "@/lib/life-lab/slug";

const ABOUT_GROUP_ID = "about";
const ARCHIVE_GROUP_ID = "archive";
const REFERENCE_GROUP_ID = "reference";
const VIDEOS_GROUP_ID = "videos";
const PLAYLIST_GROUP_PREFIX = "playlist:";

const SECONDARY_GROUP_ORDER = [
  REFERENCE_GROUP_ID,
  ARCHIVE_GROUP_ID,
  ABOUT_GROUP_ID,
] as const;

export function playlistGroupId(playlist: string): string {
  return `${PLAYLIST_GROUP_PREFIX}${playlist.toLowerCase()}`;
}

export function isPlaylistGroupId(groupId: string): boolean {
  return groupId.startsWith(PLAYLIST_GROUP_PREFIX);
}

export function playlistGroupLabel(groupId: string): string {
  return groupId.slice(PLAYLIST_GROUP_PREFIX.length);
}

export function classifyNoteGroup(note: LifeLabNoteSummary): string {
  if (isReadmeSlug(note.slug)) {
    return ABOUT_GROUP_ID;
  }

  if (note.metadata?.playlist?.trim()) {
    return playlistGroupId(note.metadata.playlist.trim());
  }

  if (!note.subfolderLabel) {
    return REFERENCE_GROUP_ID;
  }

  return note.subfolderLabel.toLowerCase();
}

function isPrimaryContentGroup(groupId: string): boolean {
  return !SECONDARY_GROUP_ORDER.includes(
    groupId as (typeof SECONDARY_GROUP_ORDER)[number],
  );
}

export function noteGroupLabel(groupId: string): string {
  if (groupId === ABOUT_GROUP_ID) {
    return "About this section";
  }

  if (groupId === REFERENCE_GROUP_ID) {
    return "Reference";
  }

  if (groupId === ARCHIVE_GROUP_ID) {
    return "Archive";
  }

  if (isPlaylistGroupId(groupId)) {
    return playlistGroupLabel(groupId);
  }

  return groupId.charAt(0).toUpperCase() + groupId.slice(1);
}

function noteSortValue(note: LifeLabNoteSummary): number {
  if (note.modifiedAt) {
    return new Date(note.modifiedAt).getTime();
  }

  const filename = relativePathFilename(
    note.relativePath || slugToRelativePath(note.slug),
  );
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

export function noteAssignmentPriority(groupId: string): number {
  if (groupId === VIDEOS_GROUP_ID) {
    return 0;
  }

  if (isPlaylistGroupId(groupId)) {
    return 5;
  }

  if (isPrimaryContentGroup(groupId)) {
    return 10;
  }

  if (groupId === REFERENCE_GROUP_ID) {
    return 20;
  }

  if (groupId === ARCHIVE_GROUP_ID) {
    return 30;
  }

  return 40;
}

function compareGroupIds(left: string, right: string): number {
  const leftPrimary = isPrimaryContentGroup(left);
  const rightPrimary = isPrimaryContentGroup(right);

  if (leftPrimary !== rightPrimary) {
    return leftPrimary ? -1 : 1;
  }

  if (leftPrimary && rightPrimary) {
    if (left === VIDEOS_GROUP_ID) {
      return -1;
    }

    if (right === VIDEOS_GROUP_ID) {
      return 1;
    }

    const leftPlaylist = isPlaylistGroupId(left);
    const rightPlaylist = isPlaylistGroupId(right);

    if (leftPlaylist !== rightPlaylist) {
      return leftPlaylist ? 1 : -1;
    }

    return left.localeCompare(right);
  }

  return (
    SECONDARY_GROUP_ORDER.indexOf(
      left as (typeof SECONDARY_GROUP_ORDER)[number],
    ) -
    SECONDARY_GROUP_ORDER.indexOf(
      right as (typeof SECONDARY_GROUP_ORDER)[number],
    )
  );
}

function disclosureSummary(label: string, count: number): string {
  const noteLabel = count === 1 ? "note" : "notes";

  return `${label} · ${count} ${noteLabel}`;
}

export function groupDisclosureSummary(group: LifeLabNoteGroup): string {
  return disclosureSummary(group.label, group.notes.length);
}

function groupLabelForId(id: string, notes: LifeLabNoteSummary[]): string {
  if (isPlaylistGroupId(id)) {
    const playlist = notes.find(
      (note) =>
        note.metadata?.playlist &&
        playlistGroupId(note.metadata.playlist.trim()) === id,
    )?.metadata?.playlist;

    if (playlist) {
      return playlist;
    }
  }

  return noteGroupLabel(id);
}

export function groupLifeLabNotes(
  notes: LifeLabNoteSummary[],
): LifeLabNoteGroup[] {
  const seenFileIds = new Set<string>();
  const seenRelativePaths = new Set<string>();
  const groups = new Map<string, LifeLabNoteSummary[]>();

  const classified = notes
    .map((note) => ({
      note,
      groupId: classifyNoteGroup(note),
    }))
    .sort((left, right) => {
      const priorityDelta =
        noteAssignmentPriority(left.groupId) - noteAssignmentPriority(right.groupId);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return noteSortValue(right.note) - noteSortValue(left.note);
    });

  for (const { note, groupId } of classified) {
    const relativePath = note.relativePath || slugToRelativePath(note.slug);

    if (seenFileIds.has(note.fileId) || seenRelativePaths.has(relativePath)) {
      continue;
    }

    seenFileIds.add(note.fileId);
    seenRelativePaths.add(relativePath);

    const existing = groups.get(groupId) ?? [];
    existing.push(note);
    groups.set(groupId, existing);
  }

  return [...groups.keys()]
    .sort(compareGroupIds)
    .map((id) => {
      const label = groupLabelForId(id, groups.get(id) ?? []);
      const groupNotes = sortNotesInGroup(groups.get(id) ?? []);
      const isPrimary = isPrimaryContentGroup(id);

      return {
        id,
        label,
        notes: groupNotes,
        collapsedByDefault: !isPrimary,
        variant: isPrimary ? ("primary" as const) : ("disclosure" as const),
      };
    })
    .filter((group) => group.notes.length > 0);
}
