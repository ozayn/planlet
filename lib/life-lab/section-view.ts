import type {
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  sortLifeLabNotes,
  type LifeLabSortKey,
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
  createYoutubeLibraryClassifier,
  isStandaloneYoutubeVideo,
  noteLibraryDedupeKey,
} from "@/lib/life-lab/youtube-library";
import {
  resolvePlaylistCardThumbnail,
} from "@/lib/life-lab/playlist-thumbnail";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";
import {
  buildPlaylistBrowseDiagnosticEntry,
  isValidPlaylistBrowseIndex,
  logPlaylistBrowseDiagnostics,
  resolvePlaylistBrowseState,
  type PlaylistBrowseDiagnosticEntry,
  type PlaylistBrowseResolutionState,
} from "@/lib/life-lab/playlist-browse-resolution";
import {
  groupStandaloneVideosByChannel,
  noteMatchesStandaloneChannelFilter,
  STANDALONE_CHANNEL_GROUP_PREVIEW_LIMIT,
  type StandaloneChannelGroup,
} from "@/lib/life-lab/standalone-channel";
import {
  findStandaloneSeriesBySlug,
  partitionStandaloneBySeries,
  STANDALONE_INDIVIDUAL_VIDEO_PREVIEW_LIMIT,
  STANDALONE_SERIES_PREVIEW_LIMIT,
  type StandaloneVideoSeries,
} from "@/lib/life-lab/standalone-series";

export type { StandaloneChannelGroup } from "@/lib/life-lab/standalone-channel";
export type { StandaloneVideoSeries } from "@/lib/life-lab/standalone-series";

export const RECENTLY_ADDED_LIMIT = 5;

export type LifeLabPlaylistCard = {
  slug: string;
  title: string;
  noteCount: number | null;
  notesLabel: string;
  channelLabel: string | null;
  resolutionState: PlaylistBrowseResolutionState;
  lastUpdatedLabel: string | null;
  progressSummary: string | null;
  href: string;
  thumbnail: ResolvedLifeLabNoteImage | null;
};

export type UnresolvedPlaylistDebug = {
  slug: string;
  title: string;
  relativePath: string;
  resolutionState: PlaylistBrowseResolutionState;
  diagnostic: CollectionCardDiagnostic;
  browseDiagnostic: PlaylistBrowseDiagnosticEntry;
};

export type PlaylistBrowseDebugInfo = {
  indexFilesFound: number;
  cardsShown: number;
  driveFolderId: string | null;
  entries: PlaylistBrowseDiagnosticEntry[];
  noIndexFilesFound: boolean;
};

export type LifeLabSectionViewBlock =
  | { kind: "continue-learning"; notes: LifeLabNoteSummary[] }
  | { kind: "recently-added"; notes: LifeLabNoteSummary[] }
  | {
      kind: "standalone-videos";
      seriesGroups: StandaloneVideoSeries[];
      previewSeriesGroups: StandaloneVideoSeries[];
      channelGroups: StandaloneChannelGroup[];
      previewChannelGroups: StandaloneChannelGroup[];
      individualNotes: LifeLabNoteSummary[];
      previewIndividualNotes: LifeLabNoteSummary[];
      totalSeriesCount: number;
      totalChannelCount: number;
      totalIndividualCount: number;
      totalCount: number;
      activeChannelFilter: string | null;
      activeSeriesFilter: string | null;
    }
  | { kind: "playlists"; items: LifeLabPlaylistCard[]; debug?: PlaylistBrowseDebugInfo }
  | { kind: "group"; group: LifeLabNoteGroup }
  | { kind: "unresolved-playlists"; items: UnresolvedPlaylistDebug[] };

export type LifeLabSectionView = {
  mode: "browse" | "results";
  blocks: LifeLabSectionViewBlock[];
};

function dedupeNotesByIdentity(notes: LifeLabNoteSummary[]): LifeLabNoteSummary[] {
  const seen = new Set<string>();
  const result: LifeLabNoteSummary[] = [];

  for (const note of notes) {
    const key = noteLibraryDedupeKey(note);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(note);
  }

  return result;
}

function excludeRecentNotes(
  notes: LifeLabNoteSummary[],
  recentKeys: Set<string>,
): LifeLabNoteSummary[] {
  return notes.filter((note) => !recentKeys.has(noteLibraryDedupeKey(note)));
}

function isReferenceLikeNote(note: LifeLabNoteSummary): boolean {
  const subfolder = note.subfolderLabel?.toLowerCase();

  if (subfolder === "archive") {
    return true;
  }

  return !note.subfolderLabel && !note.metadata?.playlist?.trim();
}

function isRecentlyAddedStandaloneNote(
  sectionId: LifeLabSectionId,
  note: LifeLabNoteSummary,
  notes: LifeLabNoteSummary[],
): boolean {
  if (sectionId !== "youtube-learning") {
    return isBrowseableContentNote(sectionId, note, notes);
  }

  return isStandaloneYoutubeVideo(note, notes);
}

function isBrowseableContentNote(
  sectionId: LifeLabSectionId,
  note: LifeLabNoteSummary,
  notes: LifeLabNoteSummary[],
): boolean {
  if (sectionId === "youtube-learning") {
    const classifier = createYoutubeLibraryClassifier(notes);
    const role = classifier.classifyRole(note);

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

function formatPlaylistNotesLabel(noteCount: number | null): string {
  if (noteCount == null || noteCount < 0) {
    return "Notes unavailable";
  }

  return `${noteCount} ${noteCount === 1 ? "note" : "notes"}`;
}

function buildPlaylistCard(input: {
  indexNote: LifeLabNoteSummary;
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  title: string;
  noteCount: number | null;
  resolutionState: PlaylistBrowseResolutionState;
}): LifeLabPlaylistCard {
  const collection = resolveCollection(input.indexNote, input.notes);
  const progressSummary = formatPlaylistCardProgress(input.indexNote.excerpt);
  const pendingMatch = input.indexNote.excerpt.match(/(\d+)\s+pending/i);
  const hasPending = pendingMatch ? Number.parseInt(pendingMatch[1] ?? "0", 10) > 0 : false;

  return {
    slug: input.indexNote.slug,
    title: input.title,
    noteCount: input.noteCount,
    notesLabel: formatPlaylistNotesLabel(input.noteCount),
    channelLabel: input.indexNote.metadata?.channel?.trim() ?? null,
    resolutionState: input.resolutionState,
    lastUpdatedLabel: noteLastUpdatedLabel(input.indexNote),
    progressSummary:
      input.resolutionState === "resolved" && hasPending ? progressSummary : null,
    href: `/life-lab/${input.sectionId}/${input.indexNote.slug}`,
    thumbnail: resolvePlaylistCardThumbnail({
      indexNote: input.indexNote,
      contentNotes: collection.contentNotes,
      playlistUrl: input.indexNote.metadata?.playlist_url,
    }),
  };
}

function buildPlaylistCards(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
  groups: LifeLabNoteGroup[],
  options: { driveFolderId?: string | null } = {},
): {
  cards: LifeLabPlaylistCard[];
  unresolved: UnresolvedPlaylistDebug[];
  debug: PlaylistBrowseDebugInfo;
} {
  const cards = new Map<string, LifeLabPlaylistCard>();
  const unresolved: UnresolvedPlaylistDebug[] = [];
  const diagnosticEntries: PlaylistBrowseDiagnosticEntry[] = [];
  let indexFilesFound = 0;

  for (const note of notes) {
    if (!isValidPlaylistBrowseIndex(sectionId, note)) {
      continue;
    }

    indexFilesFound += 1;

    const resolution = resolvePlaylistBrowseState({
      sectionId,
      indexNote: note,
      allNotes: notes,
    });
    const browseDiagnostic = buildPlaylistBrowseDiagnosticEntry({
      sectionId,
      indexNote: note,
      resolution,
    });

    diagnosticEntries.push(browseDiagnostic);

    if (resolution.state === "invalid") {
      continue;
    }

    const key = playlistKey(resolution.title);

    if (resolution.state === "partiallyResolved") {
      unresolved.push({
        slug: note.slug,
        title: resolution.title,
        relativePath: note.relativePath,
        resolutionState: resolution.state,
        diagnostic:
          resolution.collection?.diagnostic ??
          ({
            indexFileId: note.fileId,
            indexRelativePath: note.relativePath,
            resolvedFolderPath: null,
            resolutionSource: null,
            recursiveFilesFound: 0,
            excludedMetadataFiles: [],
            finalContentNoteCount: 0,
          } satisfies CollectionCardDiagnostic),
        browseDiagnostic,
      });
    }

    cards.set(
      key,
      buildPlaylistCard({
        indexNote: note,
        sectionId,
        notes,
        title: resolution.title,
        noteCount: resolution.noteCount,
        resolutionState: resolution.state,
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
      notesLabel: formatPlaylistNotesLabel(noteCount),
      channelLabel:
        indexNote?.metadata?.channel?.trim() ??
        representative?.metadata?.channel?.trim() ??
        null,
      resolutionState: "resolved",
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
    });
  }

  const debug: PlaylistBrowseDebugInfo = {
    indexFilesFound,
    cardsShown: cards.size,
    driveFolderId: options.driveFolderId ?? null,
    entries: diagnosticEntries,
    noIndexFilesFound: indexFilesFound === 0,
  };

  logPlaylistBrowseDiagnostics({
    sectionId,
    entries: diagnosticEntries,
    indexFilesFound,
    cardsShown: cards.size,
    driveFolderId: options.driveFolderId,
  });

  return {
    cards: [...cards.values()].sort((left, right) => {
      const leftTime = left.lastUpdatedLabel ?? "";
      const rightTime = right.lastUpdatedLabel ?? "";

      if (leftTime !== rightTime) {
        return rightTime.localeCompare(leftTime);
      }

      return left.title.localeCompare(right.title);
    }),
    unresolved,
    debug,
  };
}

export function diagnoseYoutubePlaylistBrowse(input: {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  groups: LifeLabNoteGroup[];
  driveFolderId?: string | null;
}): PlaylistBrowseDebugInfo {
  return buildPlaylistCards(
    input.sectionId,
    input.notes,
    input.groups,
    { driveFolderId: input.driveFolderId },
  ).debug;
}

function buildYoutubeBrowseView(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
  groups: LifeLabNoteGroup[],
  options: {
    driveFolderId?: string | null;
    sort?: LifeLabSortKey;
    channelFilter?: string | null;
    seriesFilter?: string | null;
  } = {},
): LifeLabSectionViewBlock[] {
  const sort = options.sort ?? "recent";
  const blocks: LifeLabSectionViewBlock[] = [];

  const standaloneNotes = dedupeNotesByIdentity(
    sortLifeLabNotes(
      notes.filter((note) => isStandaloneYoutubeVideo(note, notes)),
      sort,
    ),
  );

  const { seriesGroups, ungroupedNotes, seriesNoteKeys } =
    partitionStandaloneBySeries(standaloneNotes, { sort });

  const recentPool = dedupeNotesByIdentity(
    sortLifeLabNotes(
      notes.filter(
        (note) =>
          isRecentlyAddedStandaloneNote(sectionId, note, notes) &&
          !seriesNoteKeys.has(noteLibraryDedupeKey(note)),
      ),
      "recent",
    ),
  ).slice(0, RECENTLY_ADDED_LIMIT);

  if (recentPool.length > 0) {
    blocks.push({
      kind: "recently-added",
      notes: recentPool,
    });
  }

  const recentKeys = new Set(
    recentPool.map((note) => noteLibraryDedupeKey(note)),
  );

  if (standaloneNotes.length > 0) {
    const channelFilter = options.channelFilter?.trim() ?? null;
    const seriesFilter = options.seriesFilter?.trim() ?? null;
    const activeSeries = seriesFilter
      ? findStandaloneSeriesBySlug(seriesGroups, seriesFilter)
      : null;

    if (activeSeries) {
      const sortedSeriesVideos = sortLifeLabNotes(activeSeries.videos, sort);

      blocks.push({
        kind: "standalone-videos",
        seriesGroups: [activeSeries],
        previewSeriesGroups: [activeSeries],
        channelGroups: [],
        previewChannelGroups: [],
        individualNotes: sortedSeriesVideos,
        previewIndividualNotes: sortedSeriesVideos,
        totalSeriesCount: seriesGroups.length,
        totalChannelCount: 0,
        totalIndividualCount: sortedSeriesVideos.length,
        totalCount: standaloneNotes.length,
        activeChannelFilter: null,
        activeSeriesFilter: seriesFilter,
      });
    } else {
      const channelPool = channelFilter
        ? ungroupedNotes.filter((note) =>
            noteMatchesStandaloneChannelFilter(note, channelFilter),
          )
        : ungroupedNotes;

      const channelGroups =
        channelPool.length > 0
          ? groupStandaloneVideosByChannel({
              notes: channelPool,
              sort,
              excludeKeys: channelFilter ? new Set<string>() : recentKeys,
              videosPerChannelPreview: channelFilter
                ? channelPool.length
                : undefined,
            })
          : [];

      const channelPreviewKeys = new Set(
        channelGroups.flatMap((group) =>
          group.previewNotes.map((note) => noteLibraryDedupeKey(note)),
        ),
      );

      const individualNotes = sortLifeLabNotes(
        ungroupedNotes.filter(
          (note) =>
            !channelPreviewKeys.has(noteLibraryDedupeKey(note)) &&
            !recentKeys.has(noteLibraryDedupeKey(note)),
        ),
        sort,
      );

      blocks.push({
        kind: "standalone-videos",
        seriesGroups,
        previewSeriesGroups: seriesGroups.slice(0, STANDALONE_SERIES_PREVIEW_LIMIT),
        channelGroups,
        previewChannelGroups: channelFilter
          ? channelGroups
          : channelGroups.slice(0, STANDALONE_CHANNEL_GROUP_PREVIEW_LIMIT),
        individualNotes,
        previewIndividualNotes: individualNotes.slice(
          0,
          STANDALONE_INDIVIDUAL_VIDEO_PREVIEW_LIMIT,
        ),
        totalSeriesCount: seriesGroups.length,
        totalChannelCount: channelGroups.length,
        totalIndividualCount: individualNotes.length,
        totalCount: standaloneNotes.length,
        activeChannelFilter: channelFilter,
        activeSeriesFilter: null,
      });
    }
  }

  const { cards: playlistCards, unresolved, debug } = buildPlaylistCards(
    sectionId,
    notes,
    groups,
    options,
  );

  if (playlistCards.length > 0) {
    blocks.push({
      kind: "playlists",
      items: playlistCards,
      debug,
    });
  } else if (debug.indexFilesFound === 0) {
    blocks.push({
      kind: "unresolved-playlists",
      items: [],
    });
  }

  if (unresolved.length > 0) {
    blocks.push({
      kind: "unresolved-playlists",
      items: unresolved,
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

    const contentNotes = excludeRecentNotes(
      group.notes.filter((note) => isBrowseableContentNote(sectionId, note, notes)),
      recentKeys,
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
  driveFolderId?: string | null;
  sort?: LifeLabSortKey;
  channelFilter?: string | null;
  seriesFilter?: string | null;
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
      blocks: buildYoutubeBrowseView(
        input.sectionId,
        input.notes,
        input.groups,
        {
          driveFolderId: input.driveFolderId,
          sort: input.sort,
          channelFilter: input.channelFilter,
          seriesFilter: input.seriesFilter,
        },
      ),
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
