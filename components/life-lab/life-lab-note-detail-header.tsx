"use client";

import Link from "next/link";

import { LifeLabArchiveMenuItem } from "@/components/life-lab/life-lab-archive-menu-item";
import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabItemMoreMenu } from "@/components/life-lab/life-lab-item-more-menu";
import { LifeLabNoteDevToolbar } from "@/components/life-lab/life-lab-note-dev-toolbar";
import { LifeLabNoteListen } from "@/components/life-lab/life-lab-note-listen";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import { LifeLabSourceLink } from "@/components/life-lab/life-lab-source-link";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { LifeLabNote, LifeLabSectionId } from "@/lib/life-lab/constants";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import type { PlaylistVideoNavigation } from "@/lib/life-lab/playlist-index";
import { isYoutubeVideoNote } from "@/lib/life-lab/playlist-index";
import { LifeLabPlaylistVideoNav } from "@/components/life-lab/life-lab-playlist-video-nav";
import {
  collectAllMetadataChips,
  selectVisibleMetadataChips,
} from "@/lib/life-lab/metadata-chips";
import { resolveStudyStatusLabel } from "@/lib/life-lab/study-status";
import { resolveLifeLabSourceUrl } from "@/lib/life-lab/source-url";
import {
  collectLifeLabImageDetailRows,
  extractVisualAnchorSection,
  resolveLifeLabNoteImage,
} from "@/lib/life-lab/note-image";
import {
  lifeLabNoteDisplayTitle,
  lifeLabNoteDisplayTitleDiffers,
} from "@/lib/life-lab/youtube-learning";
import { lectureNoteSourceLabel } from "@/lib/life-lab/lecture-notes";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type LifeLabNoteDetailHeaderProps = {
  note: LifeLabNote;
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  playlistNav?: PlaylistVideoNavigation | null;
  readAloudPreferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  archived?: boolean;
};

function MetadataChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent-cream/60 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

function StudyStatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

export function LifeLabNoteDetailHeader({
  note,
  sectionId,
  sectionLabel,
  playlistNav = null,
  readAloudPreferences,
  openAiNarrationAvailable,
  archived = false,
}: LifeLabNoteDetailHeaderProps) {
  const displayTitle = lifeLabNoteDisplayTitle(note);
  const showFullTitle = lifeLabNoteDisplayTitleDiffers(note);
  const titleDirection = resolveTextDirection(displayTitle);
  const dateLine = note.dateLabel ?? note.modifiedAtLabel;
  const lectureSourceLabel = lectureNoteSourceLabel({
    relativePath: note.relativePath,
    metadata: note.metadata,
  });
  const statusLabel = resolveStudyStatusLabel(note.metadata);
  const flashcardCount =
    note.flashcards?.length ?? note.flashcardCount ?? 0;
  const showStudy = flashcardCount > 0;
  const itemKey = buildNoteItemKey({
    sectionId,
    relativePath: note.relativePath,
    slug: note.slug,
  });

  const chipContext = {
    sectionId,
    sectionLabel,
    subfolderLabel: note.subfolderLabel,
  };
  const mobileChipContext = { ...chipContext, variant: "detail-mobile" as const };
  const desktopChipContext = {
    ...chipContext,
    variant: "detail-compact" as const,
  };
  const allChips = collectAllMetadataChips(note.metadata, mobileChipContext);
  const { visible: mobileVisible } = selectVisibleMetadataChips(
    note.metadata,
    mobileChipContext,
  );
  const resolvedSourceUrl = isYoutubeVideoNote(note)
    ? resolveLifeLabSourceUrl({ metadata: note.metadata })
    : null;
  const imageDetailRows = collectLifeLabImageDetailRows({
    metadata: note.metadata,
    visualAnchorContent: extractVisualAnchorSection(note.content),
  });
  const showDetails =
    allChips.length > 0 ||
    showFullTitle ||
    Boolean(resolvedSourceUrl) ||
    imageDetailRows.length > 0;

  return (
    <header className="mb-3 space-y-2 border-b border-border/50 pb-3 md:mb-4 md:space-y-3 md:pb-4">
      <div className="space-y-1">
        <h1
          className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] md:text-[1.625rem] md:leading-tight"
          dir={titleDirection}
          lang={textDirectionLang(titleDirection)}
        >
          {displayTitle}
        </h1>
        <p className="text-xs text-muted" dir="auto">
          {[sectionLabel, lectureSourceLabel, dateLine]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {resolvedSourceUrl ? <LifeLabSourceLink href={resolvedSourceUrl} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {playlistNav ? (
          <LifeLabPlaylistVideoNav
            navigation={playlistNav}
            variant="header-icons"
            enableKeyboardShortcuts={false}
          />
        ) : null}
        {showStudy ? (
          <Link
            href={`/life-lab/${sectionId}/${note.slug}?view=flashcards`}
            className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
          >
            Flashcards · {flashcardCount} cards
          </Link>
        ) : null}
        <Link
          href={`/life-lab/${sectionId}`}
          className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
        >
          Back
        </Link>
        <LifeLabItemMoreMenu>
          <LifeLabArchiveMenuItem
            itemKey={itemKey}
            section={sectionId}
            itemType={
              sectionId === "learning-dictionary"
                ? "dictionary-entry"
                : "note"
            }
            archived={archived}
            labels={{
              archive: ACTION_LABELS.archiveLifeLabNote,
              unarchive: ACTION_LABELS.unarchiveLifeLabNote,
            }}
          />
        </LifeLabItemMoreMenu>
        <LifeLabNoteDevToolbar note={note} />
        <LifeLabNoteListen
          title={note.title}
          content={note.content}
          metadata={note.metadata}
          sectionId={sectionId}
          slug={note.slug}
          fileId={note.fileId}
          preferences={readAloudPreferences}
          openAiNarrationAvailable={openAiNarrationAvailable}
          includeFlashcards
        />
      </div>

      {archived ? (
        <span className="inline-flex rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
          Archived
        </span>
      ) : null}

      {statusLabel || mobileVisible.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {statusLabel ? <StudyStatusBadge label={statusLabel} /> : null}
          <LifeLabMetadataChips
            metadata={note.metadata}
            sectionId={sectionId}
            sectionLabel={sectionLabel}
            subfolderLabel={note.subfolderLabel}
            variant="detail-mobile"
            className="md:hidden"
          />
          <LifeLabMetadataChips
            metadata={note.metadata}
            sectionId={sectionId}
            sectionLabel={sectionLabel}
            subfolderLabel={note.subfolderLabel}
            variant="detail-compact"
            className="hidden md:flex"
          />
        </div>
      ) : null}

      {showDetails ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary">
            Details
            {allChips.length > 0 ? ` · ${allChips.length} tags` : ""}
          </summary>
          <div className="ui-settings-details-body space-y-3">
            {showFullTitle ? (
              <div className="space-y-1">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  Full title
                </p>
                <p className="text-sm leading-relaxed text-foreground" dir="auto">
                  {note.title}
                </p>
              </div>
            ) : null}
            {resolvedSourceUrl ? (
              <div className="space-y-1">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  Source URL
                </p>
                <p className="break-all text-sm text-muted">{resolvedSourceUrl}</p>
              </div>
            ) : null}
            {imageDetailRows.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  Image
                </p>
                {imageDetailRows.map((row) => (
                  <div key={row.label} className="space-y-0.5">
                    <p className="text-[0.6875rem] font-medium text-muted-light">
                      {row.label}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {allChips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allChips.map((label) => (
                  <MetadataChip key={label} label={label} />
                ))}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </header>
  );
}
