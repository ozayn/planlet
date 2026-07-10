import type {
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  sortLifeLabNotes,
} from "@/lib/life-lab/browse";
import {
  groupLifeLabNotes,
  isPlaylistGroupId,
  playlistGroupLabel,
} from "@/lib/life-lab/organization";
import {
  isPlaylistIndexNote,
  isYoutubeVideoNote,
} from "@/lib/life-lab/playlist-index";
import {
  isInternalPlaylistTitle,
  isPlayableYoutubeNote,
  playlistTitleKey,
} from "@/lib/life-lab/youtube-browse";
import {
  classifyYoutubeLibraryNote,
  isStandaloneYoutubeVideo,
} from "@/lib/life-lab/youtube-library";

export const STANDALONE_PREVIEW_LIMIT = 5;

export type LifeLabPlaylistCard = {
  slug: string;
  title: string;
  noteCount: number;
  lastUpdatedLabel: string | null;
  progressSummary: string | null;
  href: string;
};

export type LifeLabSectionViewBlock =
  | { kind: "continue-learning"; notes: LifeLabNoteSummary[] }
  | { kind: "recently-added"; notes: LifeLabNoteSummary[] }
  | { kind: "playlists"; items: LifeLabPlaylistCard[] }
  | {
      kind: "standalone-videos";
      previewNotes: LifeLabNoteSummary[];
      allNotes: LifeLabNoteSummary[];
      totalCount: number;
    }
  | { kind: "group"; group: LifeLabNoteGroup };

export type LifeLabSectionView = {
  mode: "browse" | "results";
  blocks: LifeLabSectionViewBlock[];
};

function isReferenceLikeNote(note: LifeLabNoteSummary): boolean {
  const subfolder = note.subfolderLabel?.toLowerCase();

  if (subfolder === "archive") {
    return true;
  }

  return !note.subfolderLabel && !note.metadata?.playlist?.trim();
}

function isBrowseableContentNote(
  sectionId: LifeLabSectionId,
  note: LifeLabNoteSummary,
): boolean {
  if (sectionId === "youtube-learning") {
    const role = classifyYoutubeLibraryNote(note);

    return role === "playlist-video" || role === "standalone-video";
  }

  if (isReferenceLikeNote(note)) {
    return false;
  }

  return true;
}

function noteLastUpdatedLabel(note: LifeLabNoteSummary): string | null {
  return note.dateLabel ?? note.modifiedAtLabel;
}

export function formatPlaylistCardProgress(excerpt: string): string | null {
  const trimmed = excerpt.trim();

  if (!trimmed) {
    return null;
  }

  const processedMatch = trimmed.match(/(\d+)\s+processed/i);
  const pendingMatch = trimmed.match(/(\d+)\s+pending/i);

  if (processedMatch && pendingMatch) {
    return `Processed ${processedMatch[1]} · Pending ${pendingMatch[1]}`;
  }

  return trimmed;
}

function playlistKey(value: string): string {
  return playlistTitleKey(value);
}

function countPlaylistPlayableNotes(
  title: string,
  groups: LifeLabNoteGroup[],
  notes: LifeLabNoteSummary[],
): number {
  const key = playlistKey(title);
  const playlistGroup = groups.find(
    (group) =>
      isPlaylistGroupId(group.id) && playlistKey(playlistGroupLabel(group.id)) === key,
  );

  if (playlistGroup) {
    return playlistGroup.notes.filter(isPlayableYoutubeNote).length;
  }

  return notes.filter(
    (note) =>
      playlistKey(note.metadata?.playlist?.trim() ?? "") === key &&
      isPlayableYoutubeNote(note),
  ).length;
}

function buildPlaylistCards(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
  groups: LifeLabNoteGroup[],
): LifeLabPlaylistCard[] {
  const cards = new Map<string, LifeLabPlaylistCard>();

  for (const note of notes) {
    if (
      !isPlaylistIndexNote({
        sectionId,
        relativePath: note.relativePath,
        subfolderLabel: note.subfolderLabel,
        metadata: note.metadata,
      })
    ) {
      continue;
    }

    const title =
      note.metadata?.playlist?.trim() ||
      note.title.trim() ||
      "Untitled playlist";

    if (isInternalPlaylistTitle(title)) {
      continue;
    }

    const key = playlistKey(title);

    cards.set(key, {
      slug: note.slug,
      title,
      noteCount: countPlaylistPlayableNotes(title, groups, notes),
      lastUpdatedLabel: noteLastUpdatedLabel(note),
      progressSummary: formatPlaylistCardProgress(note.excerpt),
      href: `/life-lab/${sectionId}/${note.slug}`,
    });
  }

  for (const group of groups) {
    if (!isPlaylistGroupId(group.id)) {
      continue;
    }

    const title = group.label;

    if (isInternalPlaylistTitle(title)) {
      continue;
    }

    const key = playlistKey(title);

    if (cards.has(key)) {
      const existing = cards.get(key);

      if (existing && existing.noteCount === 0) {
        cards.set(key, {
          ...existing,
          noteCount: countPlaylistPlayableNotes(title, groups, notes),
        });
      }

      continue;
    }

    const representative = group.notes.find(isPlayableYoutubeNote) ?? group.notes[0];

    cards.set(key, {
      slug: representative?.slug ?? key,
      title,
      noteCount: countPlaylistPlayableNotes(title, groups, notes),
      lastUpdatedLabel: representative
        ? noteLastUpdatedLabel(representative)
        : null,
      progressSummary: null,
      href: representative
        ? `/life-lab/${sectionId}/${representative.slug}`
        : `/life-lab/${sectionId}`,
    });
  }

  return [...cards.values()].sort((left, right) => {
    const leftTime = left.lastUpdatedLabel ?? "";
    const rightTime = right.lastUpdatedLabel ?? "";

    if (leftTime !== rightTime) {
      return rightTime.localeCompare(leftTime);
    }

    return left.title.localeCompare(right.title);
  });
}

function buildYoutubeBrowseView(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
  groups: LifeLabNoteGroup[],
): LifeLabSectionViewBlock[] {
  const blocks: LifeLabSectionViewBlock[] = [];

  const recentPool = sortLifeLabNotes(
    notes.filter((note) => isBrowseableContentNote(sectionId, note)),
    "recent",
  ).slice(0, 3);

  if (recentPool.length > 0) {
    blocks.push({
      kind: "recently-added",
      notes: recentPool,
    });
  }

  const recentSlugs = new Set(recentPool.map((note) => note.slug));

  const playlistCards = buildPlaylistCards(sectionId, notes, groups);

  if (playlistCards.length > 0) {
    blocks.push({
      kind: "playlists",
      items: playlistCards,
    });
  }

  const standaloneNotes = sortLifeLabNotes(
    notes.filter(isStandaloneYoutubeVideo),
    "recent",
  );

  if (standaloneNotes.length > 0) {
    const previewNotes = standaloneNotes
      .filter((note) => !recentSlugs.has(note.slug))
      .slice(0, STANDALONE_PREVIEW_LIMIT);

    blocks.push({
      kind: "standalone-videos",
      previewNotes,
      allNotes: standaloneNotes,
      totalCount: standaloneNotes.length,
    });
  }

  for (const group of groups) {
    if (group.variant === "disclosure") {
      blocks.push({ kind: "group", group });
      continue;
    }

    if (
      isPlaylistGroupId(group.id) ||
      group.id === "playlists" ||
      group.id === "videos" ||
      group.id === "standalone"
    ) {
      continue;
    }

    const contentNotes = group.notes.filter((note) =>
      isBrowseableContentNote(sectionId, note),
    );

    if (contentNotes.length === 0) {
      continue;
    }

    blocks.push({
      kind: "group",
      group: {
        ...group,
        notes: contentNotes,
      },
    });
  }

  return blocks;
}

function buildDefaultBrowseView(groups: LifeLabNoteGroup[]): LifeLabSectionViewBlock[] {
  return groups.map((group) => ({ kind: "group", group }));
}

export function buildLifeLabSectionView(input: {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  groups: LifeLabNoteGroup[];
  hasActiveQuery: boolean;
}): LifeLabSectionView {
  if (input.hasActiveQuery) {
    return {
      mode: "results",
      blocks: input.groups.map((group) => ({ kind: "group", group })),
    };
  }

  if (input.sectionId === "youtube-learning") {
    return {
      mode: "browse",
      blocks: buildYoutubeBrowseView(input.sectionId, input.notes, input.groups),
    };
  }

  return {
    mode: "browse",
    blocks: buildDefaultBrowseView(input.groups),
  };
}

export function isCompactContentNote(
  sectionId: LifeLabSectionId,
  note: LifeLabNoteSummary,
): boolean {
  return (
    sectionId === "youtube-learning" &&
    isYoutubeVideoNote(note) &&
    !isPlaylistIndexNote({
      sectionId,
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
    })
  );
}
