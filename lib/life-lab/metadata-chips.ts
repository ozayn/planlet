import type { LifeLabNoteMetadata, LifeLabSectionId } from "@/lib/life-lab/constants";
import { LIFE_LAB_ALLOWED_SECTIONS } from "@/lib/life-lab/constants";
import {
  isPlaylistGroupId,
  playlistGroupLabel,
} from "@/lib/life-lab/organization";

export type LifeLabChipContext = {
  sectionId?: LifeLabSectionId;
  sectionLabel?: string;
  groupId?: string;
  groupLabel?: string;
  subfolderLabel?: string | null;
  variant?: "card" | "detail" | "detail-compact" | "detail-mobile";
};

export type VisibleMetadataChips = {
  visible: string[];
  overflowCount: number;
};

function normalizeChipValue(value: string): string {
  return value.trim().toLowerCase();
}

function slugifyChipValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sectionAliases(sectionId: LifeLabSectionId): string[] {
  const config = LIFE_LAB_ALLOWED_SECTIONS[sectionId];
  const label = config.label;

  return [
    sectionId,
    config.folderName,
    label,
    slugifyChipValue(label),
    label.toLowerCase(),
  ];
}

function matchesAnyAlias(value: string, aliases: string[]): boolean {
  const normalized = normalizeChipValue(value);
  const slug = slugifyChipValue(value);

  return aliases.some(
    (alias) =>
      normalized === alias ||
      slug === alias ||
      slugifyChipValue(alias) === slug,
  );
}

function isPlaylistRedundant(
  playlist: string,
  context: LifeLabChipContext,
): boolean {
  if (!context.groupId || !isPlaylistGroupId(context.groupId)) {
    return false;
  }

  const groupPlaylist = playlistGroupLabel(context.groupId);

  return (
    normalizeChipValue(playlist) === normalizeChipValue(groupPlaylist) ||
    slugifyChipValue(playlist) === slugifyChipValue(groupPlaylist) ||
    (context.groupLabel
      ? normalizeChipValue(playlist) === normalizeChipValue(context.groupLabel)
      : false)
  );
}

export function isRedundantMetadataChip(
  value: string,
  context: LifeLabChipContext,
  metadata?: LifeLabNoteMetadata,
): boolean {
  const normalized = normalizeChipValue(value);

  if (!normalized) {
    return true;
  }

  if (context.sectionId && matchesAnyAlias(value, sectionAliases(context.sectionId))) {
    return true;
  }

  if (
    context.sectionId === "youtube-learning" &&
    ["youtube", "video", "videos"].includes(normalized)
  ) {
    return true;
  }

  if (
    context.sectionId === "reading-briefs" &&
    ["reading-brief", "reading-briefs", "reading brief", "reading briefs"].includes(
      normalized,
    )
  ) {
    return true;
  }

  if (
    context.sectionId === "learning-dictionary" &&
    [
      "dictionary-entry",
      "dictionary entry",
      "learning-dictionary",
      "learning dictionary",
      "concept",
      "phrase",
      "person",
      "place",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    context.sectionId === "learning-dictionary" &&
    metadata?.category &&
    normalizeChipValue(metadata.category) === normalized
  ) {
    return true;
  }

  if (
    context.sectionId === "film-lab" &&
    [
      "film-lab",
      "film lab",
      "film-summary",
      "film summary",
      "imdb",
      "imdb summary",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    context.sectionId === "film-lab" &&
    context.groupLabel &&
    normalizeChipValue(value) === normalizeChipValue(context.groupLabel)
  ) {
    return true;
  }

  const impliedSubfolder =
    context.groupId?.toLowerCase() ?? context.subfolderLabel?.toLowerCase();

  if (
    impliedSubfolder === "videos" &&
    ["video", "videos"].includes(normalized)
  ) {
    return true;
  }

  if (metadata?.playlist && isPlaylistRedundant(metadata.playlist, context)) {
    if (normalizeChipValue(value) === normalizeChipValue(metadata.playlist)) {
      return true;
    }
  }

  if (
    metadata?.source &&
    normalizeChipValue(value) === normalizeChipValue(metadata.source) &&
    context.sectionId === "youtube-learning" &&
    normalized === "youtube"
  ) {
    return true;
  }

  if (metadata?.type && normalizeChipValue(value) === normalizeChipValue(metadata.type)) {
    if (context.sectionId && matchesAnyAlias(metadata.type, sectionAliases(context.sectionId))) {
      return true;
    }
  }

  if (
    metadata?.section &&
    normalizeChipValue(value) === normalizeChipValue(metadata.section) &&
    context.sectionId &&
    matchesAnyAlias(metadata.section, sectionAliases(context.sectionId))
  ) {
    return true;
  }

  return false;
}

function maxVisibleChips(context: LifeLabChipContext): number {
  if (context.variant === "card") {
    return 0;
  }

  if (context.variant === "detail-mobile") {
    return 3;
  }

  if (context.variant === "detail-compact") {
    return 5;
  }

  return context.variant === "detail" ? 8 : 4;
}

function readingBriefCardCandidates(
  metadata: LifeLabNoteMetadata,
): string[] {
  const candidates: string[] = [];

  if (metadata.topics) {
    candidates.push(...metadata.topics);
  }

  if (metadata.people) {
    candidates.push(...metadata.people);
  }

  return candidates;
}

function dictionaryCardCandidates(metadata: LifeLabNoteMetadata): string[] {
  const candidates: string[] = [];

  if (metadata.tags) {
    candidates.push(...metadata.tags);
  }

  if (metadata.related) {
    candidates.push(...metadata.related);
  }

  return candidates;
}

function filmLabCardCandidates(metadata: LifeLabNoteMetadata): string[] {
  const candidates: string[] = [];

  if (metadata.tags) {
    candidates.push(...metadata.tags);
  }

  if (metadata.topics) {
    candidates.push(...metadata.topics);
  }

  if (metadata.people) {
    candidates.push(...metadata.people);
  }

  if (metadata.places) {
    candidates.push(...metadata.places);
  }

  return candidates;
}

export function selectVisibleMetadataChips(
  metadata: LifeLabNoteMetadata | undefined,
  context: LifeLabChipContext = {},
): VisibleMetadataChips {
  if (!metadata) {
    return { visible: [], overflowCount: 0 };
  }

  const candidates: string[] =
    context.sectionId === "reading-briefs" && context.variant === "card"
      ? readingBriefCardCandidates(metadata)
      : context.sectionId === "learning-dictionary" && context.variant === "card"
        ? dictionaryCardCandidates(metadata)
        : context.sectionId === "film-lab" && context.variant === "card"
          ? filmLabCardCandidates(metadata)
          : buildMetadataChipCandidates(metadata, context);

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const chip of candidates) {
    const key = normalizeChipValue(chip);

    if (!key || seen.has(key)) {
      continue;
    }

    if (isRedundantMetadataChip(chip, context, metadata)) {
      continue;
    }

    seen.add(key);
    deduped.push(chip);
  }

  const limit = maxVisibleChips(context);
  const visible = deduped.slice(0, limit);
  const hideOverflow =
    context.variant === "card" ||
    context.variant === "detail-mobile" ||
    (context.sectionId === "reading-briefs" &&
      context.variant === "detail-compact");

  return {
    visible,
    overflowCount: hideOverflow
      ? 0
      : Math.max(0, deduped.length - visible.length),
  };
}

function buildMetadataChipCandidates(
  metadata: LifeLabNoteMetadata,
  context: LifeLabChipContext,
): string[] {
  const candidates: string[] = [];

  if (metadata.topics) {
    candidates.push(...metadata.topics);
  }

  if (metadata.tags) {
    candidates.push(...metadata.tags);
  }

  if (metadata.people) {
    candidates.push(...metadata.people);
  }

  if (metadata.places) {
    candidates.push(...metadata.places);
  }

  if (metadata.playlist?.trim() && !isPlaylistRedundant(metadata.playlist, context)) {
    candidates.push(metadata.playlist.trim());
  }

  if (
    (context.variant === "detail" || context.variant === "detail-compact") &&
    metadata.channel?.trim() &&
    !isRedundantMetadataChip(metadata.channel, context, metadata)
  ) {
    candidates.push(metadata.channel.trim());
  }

  return candidates;
}

export function collectAllMetadataChips(
  metadata: LifeLabNoteMetadata | undefined,
  context: LifeLabChipContext = {},
): string[] {
  if (!metadata) {
    return [];
  }

  const candidates = buildMetadataChipCandidates(metadata, {
    ...context,
    variant: "detail",
  });
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const chip of candidates) {
    const key = normalizeChipValue(chip);

    if (!key || seen.has(key)) {
      continue;
    }

    if (isRedundantMetadataChip(chip, context, metadata)) {
      continue;
    }

    seen.add(key);
    deduped.push(chip);
  }

  return deduped;
}
