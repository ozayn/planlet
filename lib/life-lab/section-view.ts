import type {
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  buildLifeLabHighlights,
  sortLifeLabNotes,
  type LifeLabHighlights,
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

export type LifeLabPlaylistCard = {
  slug: string;
  title: string;
  videoCount: number;
  lastUpdatedLabel: string | null;
  progressSummary: string | null;
  href: string;
};

export type LifeLabSectionViewBlock =
  | { kind: "continue-learning"; notes: LifeLabNoteSummary[] }
  | { kind: "recently-added"; notes: LifeLabNoteSummary[] }
  | { kind: "playlists"; items: LifeLabPlaylistCard[] }
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
  if (isReferenceLikeNote(note)) {
    return false;
  }

  if (
    sectionId === "youtube-learning" &&
    isPlaylistIndexNote({
      sectionId,
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
    })
  ) {
    return false;
  }

  return true;
}

function noteLastUpdatedLabel(note: LifeLabNoteSummary): string | null {
  return note.dateLabel ?? note.modifiedAtLabel;
}

function parseProcessedCount(excerpt: string): number | null {
  const match = excerpt.match(/(\d+)\s+processed/i);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
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
  return value.trim().toLowerCase();
}

function buildPlaylistCards(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
  groups: LifeLabNoteGroup[],
): LifeLabPlaylistCard[] {
  const cards = new Map<string, LifeLabPlaylistCard>();
  const playlistGroupCounts = new Map<string, number>();

  for (const group of groups) {
    if (!isPlaylistGroupId(group.id)) {
      continue;
    }

    playlistGroupCounts.set(playlistGroupLabel(group.id), group.notes.length);
  }

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
    const key = playlistKey(title);
    const processedCount = parseProcessedCount(note.excerpt);
    const groupCount = playlistGroupCounts.get(title) ?? 0;

    cards.set(key, {
      slug: note.slug,
      title,
      videoCount: processedCount ?? groupCount,
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
    const key = playlistKey(title);

    if (cards.has(key)) {
      continue;
    }

    const representative = group.notes[0];

    cards.set(key, {
      slug: representative?.slug ?? key,
      title,
      videoCount: group.notes.length,
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

function buildHighlightsForSection(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
): LifeLabHighlights {
  const contentNotes = notes.filter((note) =>
    isBrowseableContentNote(sectionId, note),
  );
  const pool = contentNotes.length > 0 ? contentNotes : notes;

  return buildLifeLabHighlights(pool, 3);
}

function buildYoutubeBrowseView(
  sectionId: LifeLabSectionId,
  notes: LifeLabNoteSummary[],
  groups: LifeLabNoteGroup[],
): LifeLabSectionViewBlock[] {
  const highlights = buildHighlightsForSection(sectionId, notes);
  const blocks: LifeLabSectionViewBlock[] = [];

  if (highlights.continueStudying.length > 0) {
    blocks.push({
      kind: "continue-learning",
      notes: highlights.continueStudying,
    });
  }

  const recentPool = sortLifeLabNotes(
    notes.filter((note) => isBrowseableContentNote(sectionId, note)),
    "recent",
  ).slice(0, 3);

  const continueSlugs = new Set(
    highlights.continueStudying.map((note) => note.slug),
  );
  const recentlyAdded = recentPool.filter((note) => !continueSlugs.has(note.slug));

  if (recentlyAdded.length > 0) {
    blocks.push({
      kind: "recently-added",
      notes: recentlyAdded,
    });
  }

  const playlistCards = buildPlaylistCards(sectionId, notes, groups);

  if (playlistCards.length > 0) {
    blocks.push({
      kind: "playlists",
      items: playlistCards,
    });
  }

  for (const group of groups) {
    if (group.variant === "disclosure") {
      blocks.push({ kind: "group", group });
      continue;
    }

    if (isPlaylistGroupId(group.id) || group.id === "playlists") {
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
