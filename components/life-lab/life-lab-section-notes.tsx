"use client";

import Link from "next/link";
import { useState } from "react";

import { LifeLabNoteCardMeta } from "@/components/life-lab/life-lab-note-card-meta";
import { LifeLabNoteCardDevMenu } from "@/components/life-lab/life-lab-note-card-dev-menu";
import { LifeLabNoteImageFigure } from "@/components/life-lab/life-lab-note-image";
import { LifeLabPlaylistCardList } from "@/components/life-lab/life-lab-playlist-card-list";
import {
  LifeLabContinueLearning,
  LifeLabRecentlyAdded,
} from "@/components/life-lab/life-lab-section-highlights";
import { LifeLabStandaloneVideos } from "@/components/life-lab/life-lab-standalone-videos";
import type {
  LifeLabListingDiagnostic,
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { selectCardPreview } from "@/lib/life-lab/card-preview";
import {
  dictionaryCategoryLabel,
  resolveDictionaryCategory,
} from "@/lib/life-lab/learning-dictionary";
import { groupDisclosureSummary } from "@/lib/life-lab/organization";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { isPlaylistIndexNote } from "@/lib/life-lab/playlist-index";
import type {
  LifeLabSectionView,
  PlaylistBrowseDebugInfo,
  UnresolvedPlaylistDebug,
} from "@/lib/life-lab/section-view";

const YOUTUBE_LIBRARY_DISCLOSURE_GROUPS = new Set([
  "reference",
  "archive",
  "about",
]);

type LifeLabSectionNotesProps = {
  sectionId: LifeLabSectionId;
  sectionView: LifeLabSectionView;
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  searchQuery?: string;
};

type LifeLabNoteCardProps = {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
  group: LifeLabNoteGroup;
  searchQuery?: string;
  compact?: boolean;
};

const GROUP_INITIAL_VISIBLE = 5;

function LifeLabListingDiagnosticPanel({
  diagnostic,
  unresolvedPlaylists = [],
  playlistBrowseDebug = null,
}: {
  diagnostic: LifeLabListingDiagnostic;
  unresolvedPlaylists?: UnresolvedPlaylistDebug[];
  playlistBrowseDebug?: PlaylistBrowseDebugInfo | null;
}) {
  const rows = [
    { label: "Files found", value: String(diagnostic.fileCount) },
    { label: "Folders traversed", value: String(diagnostic.foldersTraversed) },
    { label: "Max depth used", value: String(diagnostic.maxDepthUsed) },
    {
      label: "Pagination occurred",
      value: diagnostic.paginationOccurred ? "Yes" : "No",
    },
  ];

  if (diagnostic.cache) {
    rows.push(
      {
        label: "Cache hit",
        value: diagnostic.cache.fromCache ? "Yes" : "No",
      },
      { label: "Cache key", value: diagnostic.cache.cacheKey },
      {
        label: "Cache tags",
        value: diagnostic.cache.cacheTags.join(", "),
      },
      { label: "Cached at", value: diagnostic.cache.cachedAt },
      { label: "Expires at", value: diagnostic.cache.expiresAt },
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">Debug</summary>
      <div className="ui-settings-details-body space-y-4">
        <dl className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="ui-settings-info-row">
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-end text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        {playlistBrowseDebug?.noIndexFilesFound ? (
          <p className="text-xs text-muted">
            No playlist index files found
            {playlistBrowseDebug.driveFolderId
              ? ` in Drive folder ${playlistBrowseDebug.driveFolderId}`
              : ""}
            .
          </p>
        ) : null}
        {playlistBrowseDebug && playlistBrowseDebug.entries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Playlist resolution
            </p>
            <ul className="space-y-2 text-xs text-muted">
              {playlistBrowseDebug.entries.map((entry) => (
                <li
                  key={entry.indexFileId}
                  className="rounded-lg border border-border/50 bg-surface px-3 py-2"
                >
                  <p className="font-medium text-foreground">{entry.title}</p>
                  <p>{entry.relativePath}</p>
                  <p>State: {entry.state}</p>
                  <p>Playlist ID: {entry.playlistId ?? "none"}</p>
                  <p>Asset path: {entry.assetPath ?? "none"}</p>
                  <p>
                    Folder: {entry.resolvedFolderPath ?? "unresolved"}
                  </p>
                  <p>Source: {entry.resolutionSource ?? "none"}</p>
                  <p>Note count: {entry.noteCount ?? "unknown"}</p>
                  {entry.hiddenReason ? (
                    <p>Hidden reason: {entry.hiddenReason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {unresolvedPlaylists.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Partially resolved playlists
            </p>
            <ul className="space-y-2 text-xs text-muted">
              {unresolvedPlaylists.map((item) => (
                <li
                  key={item.slug}
                  className="rounded-lg border border-border/50 bg-surface px-3 py-2"
                >
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p>{item.relativePath}</p>
                  <p>State: {item.resolutionState}</p>
                  <p>
                    Folder: {item.diagnostic.resolvedFolderPath ?? "unresolved"}
                  </p>
                  <p>Source: {item.diagnostic.resolutionSource ?? "none"}</p>
                  <p>Files found: {item.diagnostic.recursiveFilesFound}</p>
                  <p>
                    Excluded: {item.diagnostic.excludedMetadataFiles.length}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function shouldShowSubfolderLabel(
  note: LifeLabNoteSummary,
  group: LifeLabNoteGroup,
): boolean {
  if (!note.subfolderLabel) {
    return false;
  }

  const subfolder = note.subfolderLabel.toLowerCase();

  return group.id !== subfolder && !group.id.startsWith(`${subfolder}:`);
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

function CardPreview({
  note,
  searchQuery,
}: {
  note: LifeLabNoteSummary;
  searchQuery?: string;
}) {
  const preview = selectCardPreview(note, { searchQuery });

  if (!preview) {
    return null;
  }

  return (
    <p className="line-clamp-1 text-xs leading-relaxed text-muted">
      {preview}
    </p>
  );
}

function CompactNoteMeta({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const showStudy = note.hasFlashcards && (note.flashcardCount ?? 0) > 0;

  return (
    <LifeLabNoteCardMeta
      sectionId={sectionId}
      note={note}
      className={showStudy ? "gap-1.5" : undefined}
    />
  );
}

function LifeLabDictionaryNoteCard({
  sectionId,
  note,
  searchQuery,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
  searchQuery?: string;
}) {
  const category = resolveDictionaryCategory(note);
  const categoryLabel = category ? dictionaryCategoryLabel(category) : null;

  return (
    <li>
      <div className="relative rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent-cream/20">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {categoryLabel ? <CategoryBadge label={categoryLabel} /> : null}
                {note.dateLabel ?? note.modifiedAtLabel ? (
                  <span className="text-[0.6875rem] text-muted-light">
                    {note.dateLabel ?? note.modifiedAtLabel}
                  </span>
                ) : null}
              </div>
              <Link
                href={`/life-lab/${sectionId}/${note.slug}`}
                className="block line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-foreground/80"
              >
                {note.title}
              </Link>
              <CompactNoteMeta sectionId={sectionId} note={note} />
              <CardPreview note={note} searchQuery={searchQuery} />
          </div>
        </div>
        <div className="absolute right-2.5 top-2.5">
          <LifeLabNoteCardDevMenu sectionId={sectionId} note={note} />
        </div>
      </div>
    </li>
  );
}

function LifeLabNoteCard({
  sectionId,
  note,
  group,
  searchQuery,
  compact = false,
}: LifeLabNoteCardProps) {
  if (
    sectionId === "youtube-learning" &&
    isPlaylistIndexNote({
      sectionId,
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
    })
  ) {
    return null;
  }

  const noteImage = resolveLifeLabNoteImage(note.metadata);

  return (
    <li>
      <div
        className={`relative rounded-lg border border-border/50 transition-colors hover:bg-accent-cream/20 ${
          compact ? "px-3 py-2.5" : "px-3 py-3"
        }`}
      >
        <div className="flex items-start justify-between gap-3 pr-8">
          {sectionId === "youtube-learning" && noteImage ? (
            <LifeLabNoteImageFigure
              image={noteImage}
              variant="thumbnail"
              fallbackTitle={note.title}
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
              {!compact && shouldShowSubfolderLabel(note, group) ? (
                <p className="text-[0.6875rem] font-medium text-muted-light">
                  {note.subfolderLabel}
                </p>
              ) : null}
              <Link
                href={`/life-lab/${sectionId}/${note.slug}`}
                className="block line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-foreground/80 md:line-clamp-1"
              >
                {note.title}
              </Link>
              <CompactNoteMeta sectionId={sectionId} note={note} />
              <CardPreview note={note} searchQuery={searchQuery} />
          </div>
          {note.dateLabel ?? note.modifiedAtLabel ? (
            <span className="shrink-0 pt-0.5 text-[0.6875rem] text-muted-light">
              {note.dateLabel ?? note.modifiedAtLabel}
            </span>
          ) : null}
        </div>
        <div className="absolute right-2.5 top-2.5">
          <LifeLabNoteCardDevMenu sectionId={sectionId} note={note} />
        </div>
      </div>
    </li>
  );
}

function LifeLabNoteList({
  sectionId,
  group,
  searchQuery,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
  searchQuery?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = group.notes.length > GROUP_INITIAL_VISIBLE;
  const visibleNotes =
    hasOverflow && !expanded
      ? group.notes.slice(0, GROUP_INITIAL_VISIBLE)
      : group.notes;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visibleNotes.map((note) =>
          sectionId === "learning-dictionary" ? (
            <LifeLabDictionaryNoteCard
              key={note.slug}
              sectionId={sectionId}
              note={note}
              searchQuery={searchQuery}
            />
          ) : (
            <LifeLabNoteCard
              key={note.slug}
              sectionId={sectionId}
              note={note}
              group={group}
              searchQuery={searchQuery}
              compact
            />
          ),
        )}
      </ul>
      {hasOverflow ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {expanded ? "Show less" : `View all ${group.notes.length} notes →`}
        </button>
      ) : null}
    </div>
  );
}

function LifeLabLibraryDisclosureList({
  sectionId,
  group,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
}) {
  return (
    <ul className="space-y-1.5">
      {group.notes.map((note) => (
        <li key={note.slug}>
          <Link
            href={`/life-lab/${sectionId}/${note.slug}`}
            className="flex items-start gap-2 text-sm text-foreground transition-colors hover:text-foreground/80"
          >
            <span className="text-muted" aria-hidden="true">
              •
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{note.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LifeLabNoteGroupSection({
  sectionId,
  group,
  searchQuery,
  defaultOpen = false,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
  searchQuery?: string;
  defaultOpen?: boolean;
}) {
  const hidePrimaryHeading =
    sectionId === "reading-briefs" &&
    group.variant === "primary" &&
    group.notes.length === 1;
  const isYoutubeLibraryDisclosure =
    sectionId === "youtube-learning" &&
    group.variant === "disclosure" &&
    YOUTUBE_LIBRARY_DISCLOSURE_GROUPS.has(group.id);

  if (group.variant === "primary") {
    return (
      <section className={hidePrimaryHeading ? "space-y-0" : "space-y-2"}>
        {hidePrimaryHeading ? null : (
          <h2 className="text-sm font-medium text-muted">{group.label}</h2>
        )}
        <LifeLabNoteList
          sectionId={sectionId}
          group={group}
          searchQuery={searchQuery}
        />
      </section>
    );
  }

  return (
    <details
      className="ui-settings-details group"
      open={defaultOpen ? true : undefined}
    >
      <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
        <span className="font-medium text-muted">
          {isYoutubeLibraryDisclosure
            ? group.label
            : groupDisclosureSummary(group)}
        </span>
      </summary>
      <div className="ui-settings-details-body">
        {isYoutubeLibraryDisclosure ? (
          <LifeLabLibraryDisclosureList sectionId={sectionId} group={group} />
        ) : (
          <LifeLabNoteList
            sectionId={sectionId}
            group={group}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </details>
  );
}

export function LifeLabSectionNotes({
  sectionId,
  sectionView,
  listingDiagnostic,
  showDiagnostics,
  searchQuery,
}: LifeLabSectionNotesProps) {
  const unresolvedPlaylists = sectionView.blocks.flatMap((block) =>
    block.kind === "unresolved-playlists" ? block.items : [],
  );
  const playlistBrowseDebug = sectionView.blocks.find(
    (block) => block.kind === "playlists",
  );
  const playlistDebugInfo =
    playlistBrowseDebug?.kind === "playlists"
      ? (playlistBrowseDebug.debug ?? null)
      : null;
  const noPlaylistIndexes =
    sectionView.blocks.some(
      (block) =>
        block.kind === "unresolved-playlists" &&
        block.items.length === 0 &&
        playlistDebugInfo?.noIndexFilesFound,
    ) || playlistDebugInfo?.noIndexFilesFound;

  return (
    <div className="space-y-8">
      {sectionView.mode === "results" ? (
        <p className="text-xs text-muted">
          {sectionView.blocks.reduce(
            (count, block) =>
              block.kind === "group" ? count + block.group.notes.length : count,
            0,
          )}{" "}
          matching notes
        </p>
      ) : null}

      {sectionView.blocks.map((block, index) => {
        switch (block.kind) {
          case "continue-learning":
            return (
              <LifeLabContinueLearning
                key={`continue-${index}`}
                sectionId={sectionId}
                notes={block.notes}
              />
            );
          case "recently-added":
            return (
              <LifeLabRecentlyAdded
                key={`recent-${index}`}
                sectionId={sectionId}
                notes={block.notes}
              />
            );
          case "playlists":
            return (
              <LifeLabPlaylistCardList
                key={`playlists-${index}`}
                items={block.items}
              />
            );
          case "standalone-videos":
            return (
              <LifeLabStandaloneVideos
                key={`standalone-${index}`}
                sectionId={sectionId}
                previewNotes={block.previewNotes}
                allNotes={block.allNotes}
                totalCount={block.totalCount}
              />
            );
          case "unresolved-playlists":
            return null;
          case "group":
            return (
              <LifeLabNoteGroupSection
                key={block.group.id}
                sectionId={sectionId}
                group={block.group}
                searchQuery={searchQuery}
              />
            );
          default:
            return null;
        }
      })}

      {showDiagnostics && listingDiagnostic ? (
        <LifeLabListingDiagnosticPanel
          diagnostic={listingDiagnostic}
          unresolvedPlaylists={unresolvedPlaylists}
          playlistBrowseDebug={
            playlistDebugInfo ??
            (noPlaylistIndexes
              ? {
                  indexFilesFound: 0,
                  cardsShown: 0,
                  driveFolderId: null,
                  entries: [],
                  noIndexFilesFound: true,
                }
              : null)
          }
        />
      ) : null}
    </div>
  );
}
