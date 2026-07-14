import type {
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  monthKeyLabel,
  noteMonthKey,
  sortLifeLabNotes,
  type LifeLabSortKey,
} from "@/lib/life-lab/browse";
import {
  classifyDictionaryNoteGroup,
  compareDictionaryGroupIds,
  dictionaryCategoryLabel,
  isDictionaryCategoryId,
} from "@/lib/life-lab/learning-dictionary";
import {
  classifyFilmLabNoteGroup,
  compareFilmLabGroupIds,
  filmLabGroupLabel,
  isFilmLabGroupId,
} from "@/lib/life-lab/film-lab";
import {
  isReadmeSlug,
  parseDateFromFilename,
  relativePathFilename,
  slugToRelativePath,
} from "@/lib/life-lab/slug";
import {
  createYoutubeLibraryClassifier,
  noteLibraryDedupeKey,
} from "@/lib/life-lab/youtube-library";

const ABOUT_GROUP_ID = "about";
const ARCHIVE_GROUP_ID = "archive";
const REFERENCE_GROUP_ID = "reference";
const VIDEOS_GROUP_ID = "videos";
const STANDALONE_GROUP_ID = "standalone";
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

function classifyYoutubeNoteGroup(
  note: LifeLabNoteSummary,
  classifier: ReturnType<typeof createYoutubeLibraryClassifier>,
): string {
  const role = classifier.classifyRole(note);

  switch (role) {
    case "playlist-video": {
      const ownership = classifier.classifyOwnership(note);

      if (ownership?.kind === "playlist") {
        return playlistGroupId(ownership.playlistTitle);
      }

      const playlist = note.metadata?.playlist?.trim();

      return playlist ? playlistGroupId(playlist) : VIDEOS_GROUP_ID;
    }
    case "standalone-video":
      return STANDALONE_GROUP_ID;
    case "unresolved-playlist-video":
      return REFERENCE_GROUP_ID;
    case "reference":
      return REFERENCE_GROUP_ID;
    case "archive":
      return ARCHIVE_GROUP_ID;
    case "about":
      return ABOUT_GROUP_ID;
    default:
      return classifyNoteGroup(note);
  }
}

function isPrimaryContentGroup(groupId: string): boolean {
  return !SECONDARY_GROUP_ORDER.includes(
    groupId as (typeof SECONDARY_GROUP_ORDER)[number],
  );
}

export function noteGroupLabel(
  groupId: string,
  sectionId?: LifeLabSectionId,
): string {
  if (groupId === ABOUT_GROUP_ID) {
    return sectionId === "youtube-learning"
      ? "About YouTube Learning"
      : "About this section";
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
  if (isPlaylistGroupId(groupId)) {
    return 0;
  }

  if (groupId === STANDALONE_GROUP_ID || groupId === VIDEOS_GROUP_ID) {
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

function groupLabelForId(
  id: string,
  notes: LifeLabNoteSummary[],
  sectionId?: LifeLabSectionId,
): string {
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

  return noteGroupLabel(id, sectionId);
}

export type GroupLifeLabNotesOptions = {
  sectionId?: LifeLabSectionId;
  sort?: LifeLabSortKey;
};

// When a dated primary group grows large, split it into month groups so the
// latest notes stay scannable and older ones collapse behind month headers.
const MONTH_SPLIT_THRESHOLD = 8;

function splitLargeDatedGroupByMonth(
  group: LifeLabNoteGroup,
): LifeLabNoteGroup[] {
  if (group.notes.length <= MONTH_SPLIT_THRESHOLD) {
    return [group];
  }

  const monthBuckets = new Map<string, LifeLabNoteSummary[]>();
  const undated: LifeLabNoteSummary[] = [];

  for (const note of group.notes) {
    const monthKey = noteMonthKey(note);

    if (!monthKey) {
      undated.push(note);
      continue;
    }

    const bucket = monthBuckets.get(monthKey) ?? [];
    bucket.push(note);
    monthBuckets.set(monthKey, bucket);
  }

  if (monthBuckets.size <= 1) {
    return [group];
  }

  const monthKeys = [...monthBuckets.keys()].sort((left, right) =>
    right.localeCompare(left),
  );

  const monthGroups = monthKeys.map((monthKey, index) => ({
    id: `${group.id}:${monthKey}`,
    label: `${group.label} · ${monthKeyLabel(monthKey)}`,
    notes: monthBuckets.get(monthKey) ?? [],
    collapsedByDefault: index > 0,
    variant: index === 0 ? ("primary" as const) : ("disclosure" as const),
  }));

  if (undated.length > 0) {
    monthGroups.push({
      id: `${group.id}:undated`,
      label: `${group.label} · Undated`,
      notes: undated,
      collapsedByDefault: true,
      variant: "disclosure" as const,
    });
  }

  return monthGroups;
}

function mergeSecondaryGroups(
  groups: LifeLabNoteGroup[],
  mergedLabel: string,
): LifeLabNoteGroup[] {
  const primaryGroups = groups.filter((group) => group.variant === "primary");
  const secondaryGroups = groups.filter(
    (group) => group.variant === "disclosure",
  );

  if (secondaryGroups.length === 0) {
    return groups;
  }

  const mergedNotes = sortNotesInGroup(
    secondaryGroups.flatMap((group) => group.notes),
  );

  return [
    ...primaryGroups,
    {
      id: "section-files",
      label: mergedLabel,
      notes: mergedNotes,
      collapsedByDefault: true,
      variant: "disclosure",
    },
  ];
}

function mergeReadingBriefSecondaryGroups(
  groups: LifeLabNoteGroup[],
): LifeLabNoteGroup[] {
  return mergeSecondaryGroups(groups, "About & reference");
}

function mergeDictionarySecondaryGroups(
  groups: LifeLabNoteGroup[],
): LifeLabNoteGroup[] {
  return mergeSecondaryGroups(groups, "About & reference");
}

function mergeFilmLabSecondaryGroups(
  groups: LifeLabNoteGroup[],
): LifeLabNoteGroup[] {
  return mergeSecondaryGroups(groups, "About & reference");
}

function classifyNoteGroupForSection(
  note: LifeLabNoteSummary,
  sectionId?: LifeLabSectionId,
  classifier?: ReturnType<typeof createYoutubeLibraryClassifier>,
): string {
  if (sectionId === "youtube-learning" && classifier) {
    return classifyYoutubeNoteGroup(note, classifier);
  }

  if (sectionId === "youtube-learning") {
    return classifyYoutubeNoteGroup(
      note,
      createYoutubeLibraryClassifier([]),
    );
  }

  if (sectionId === "learning-dictionary") {
    return classifyDictionaryNoteGroup(note);
  }

  if (sectionId === "film-lab") {
    return classifyFilmLabNoteGroup(note);
  }

  return classifyNoteGroup(note);
}

function compareGroupIdsForSection(
  left: string,
  right: string,
  sectionId?: LifeLabSectionId,
): number {
  if (sectionId === "learning-dictionary") {
    return compareDictionaryGroupIds(left, right);
  }

  if (sectionId === "film-lab") {
    return compareFilmLabGroupIds(left, right);
  }

  return compareGroupIds(left, right);
}

function groupLabelForSectionId(
  id: string,
  notes: LifeLabNoteSummary[],
  sectionId?: LifeLabSectionId,
): string {
  if (sectionId === "learning-dictionary") {
    if (id === "about" || id === "reference") {
      return groupLabelForId(id, notes, sectionId);
    }

    return dictionaryCategoryLabel(id);
  }

  if (sectionId === "film-lab" && isFilmLabGroupId(id)) {
    return filmLabGroupLabel(id);
  }

  return groupLabelForId(id, notes, sectionId);
}

function isPrimaryFilmLabGroup(groupId: string): boolean {
  return isFilmLabGroupId(groupId);
}

function isPrimaryDictionaryGroup(groupId: string): boolean {
  return isDictionaryCategoryId(groupId);
}

export function groupLifeLabNotes(
  notes: LifeLabNoteSummary[],
  options: GroupLifeLabNotesOptions = {},
): LifeLabNoteGroup[] {
  const seenKeys = new Set<string>();
  const groups = new Map<string, LifeLabNoteSummary[]>();
  const classifier =
    options.sectionId === "youtube-learning"
      ? createYoutubeLibraryClassifier(notes)
      : null;

  const classified = notes
    .map((note) => ({
      note,
      groupId: classifyNoteGroupForSection(note, options.sectionId, classifier ?? undefined),
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
    const key = noteLibraryDedupeKey(note);

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);

    const existing = groups.get(groupId) ?? [];
    existing.push(note);
    groups.set(groupId, existing);
  }

  const builtGroups = [...groups.keys()]
    .sort((left, right) =>
      compareGroupIdsForSection(left, right, options.sectionId),
    )
    .map((id) => {
      const groupNotes = groups.get(id) ?? [];
      const label = groupLabelForSectionId(id, groupNotes, options.sectionId);
      const sortedNotes = options.sort
        ? sortLifeLabNotes(groupNotes, options.sort)
        : sortNotesInGroup(groupNotes);
      const isPrimary =
        options.sectionId === "learning-dictionary"
          ? isPrimaryDictionaryGroup(id)
          : options.sectionId === "film-lab"
            ? isPrimaryFilmLabGroup(id)
            : isPrimaryContentGroup(id);

      return {
        id,
        label,
        notes: sortedNotes,
        collapsedByDefault: !isPrimary,
        variant: isPrimary ? ("primary" as const) : ("disclosure" as const),
      };
    })
    .filter((group) => group.notes.length > 0);

  if (options.sectionId === "reading-briefs") {
    const merged = mergeReadingBriefSecondaryGroups(builtGroups);

    return merged.flatMap((group) =>
      group.variant === "primary"
        ? splitLargeDatedGroupByMonth(group)
        : [group],
    );
  }

  if (options.sectionId === "learning-dictionary") {
    return mergeDictionarySecondaryGroups(builtGroups);
  }

  if (options.sectionId === "film-lab") {
    return mergeFilmLabSecondaryGroups(builtGroups);
  }

  return builtGroups;
}
