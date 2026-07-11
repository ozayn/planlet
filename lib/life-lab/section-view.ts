import type {
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  sortLifeLabNotes,
} from "@/lib/life-lab/browse";
import {
  isPlaylistGroupId,
} from "@/lib/life-lab/organization";
import {
  formatCollectionDisplayTitle,
  getCollectionNoteCount,
  listCollectionContentNotes,
  resolveCollection,
  type CollectionCardDiagnostic,
} from "@/lib/life-lab/collection";
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
import {
  resolvePlaylistCardThumbnail,
} from "@/lib/life-lab/playlist-thumbnail";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";

export const STANDALONE_PREVIEW_LIMIT = 5;

export type LifeLabPlaylistCard = {
  slug: string;
  title: string;
  noteCount: number;
  lastUpdatedLabel: string | null;
  progressSummary: string | null;
  href: string;
  thumbnail: ResolvedLifeLabNoteImage | null;
  unavailableLabel?: string | null;
  dev?: CollectionCardDiagnostic;
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

function countCollectionNotes(
  indexNote: LifeLabNoteSummary,
  notes: LifeLabNoteSummary[],
): number {
  return getCollectionNoteCount(indexNote, notes);
}

function buildPlaylistCard(input: {
  indexNote: LifeLabNoteSummary;
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  title: string;
  noteCount: number;
  unavailableLabel?: string | null;
  dev?: CollectionCardDiagnostic;
}): LifeLabPlaylistCard {
  const collection = resolveCollection(input.indexNote, input.notes);

  return {
    slug: input.indexNote.slug,
    title: input.title,
    noteCount: input.noteCount,
    lastUpdatedLabel: noteLastUpdatedLabel(input.indexNote),
    progressSummary: formatPlaylistCardProgress(input.indexNote.excerpt),
    href: `/life-lab/${input.sectionId}/${input.indexNote.slug}`,
    thumbnail: resolvePlaylistCardThumbnail({
      indexNote: input.indexNote,
      contentNotes: collection.contentNotes,
      playlistUrl: input.indexNote.metadata?.playlist_url,
    }),
    unavailableLabel: input.unavailableLabel,
    dev: input.dev,
  };
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

    const title = formatCollectionDisplayTitle({
      title: note.title,
      metadata: note.metadata,
    });

    if (isInternalPlaylistTitle(title)) {
      continue;
    }

    const key = playlistKey(title);
    const collection = resolveCollection(note, notes);
    const noteCount = collection.contentNotes.length;

    if (!collection.resolved && noteCount === 0) {
      if (process.env.NODE_ENV === "development") {
        cards.set(
          key,
          buildPlaylistCard({
            indexNote: note,
            sectionId,
            notes,
            title,
            noteCount: 0,
            unavailableLabel: "Collection folder not resolved",
            dev: collection.diagnostic,
          }),
        );
      }

      continue;
    }

    cards.set(
      key,
      buildPlaylistCard({
        indexNote: note,
        sectionId,
        notes,
        title,
        noteCount,
        dev:
          process.env.NODE_ENV === "development"
            ? collection.diagnostic
            : undefined,
      }),
    );
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
      continue;
    }

    const indexNote = notes.find(
      (note) =>
        isPlaylistIndexNote({
          sectionId,
          relativePath: note.relativePath,
          subfolderLabel: note.subfolderLabel,
          metadata: note.metadata,
        }) &&
        playlistKey(
          formatCollectionDisplayTitle({
            title: note.title,
            metadata: note.metadata,
          }),
        ) === key,
    );

    const representative =
      (indexNote
        ? listCollectionContentNotes(indexNote, notes).find(isPlayableYoutubeNote)
        : null) ??
      group.notes.find(isPlayableYoutubeNote) ??
      group.notes[0];

    const noteCount = indexNote
      ? countCollectionNotes(indexNote, notes)
      : group.notes.filter(isPlayableYoutubeNote).length;

    if (noteCount === 0 && !indexNote) {
      continue;
    }

    const contentNotes = indexNote
      ? listCollectionContentNotes(indexNote, notes)
      : group.notes;

    cards.set(key, {
      slug: indexNote?.slug ?? representative?.slug ?? key,
      title,
      noteCount,
      lastUpdatedLabel: representative
        ? noteLastUpdatedLabel(representative)
        : null,
      progressSummary: indexNote
        ? formatPlaylistCardProgress(indexNote.excerpt)
        : null,
      href: indexNote
        ? `/life-lab/${sectionId}/${indexNote.slug}`
        : representative
          ? `/life-lab/${sectionId}/${representative.slug}`
          : `/life-lab/${sectionId}`,
      thumbnail: indexNote
        ? resolvePlaylistCardThumbnail({
            indexNote,
            contentNotes,
            playlistUrl: indexNote.metadata?.playlist_url,
          })
        : resolvePlaylistCardThumbnail({
            indexNote: representative ?? group.notes[0]!,
            contentNotes,
          }),
      dev:
        indexNote && process.env.NODE_ENV === "development"
          ? resolveCollection(indexNote, notes).diagnostic
          : undefined,
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
