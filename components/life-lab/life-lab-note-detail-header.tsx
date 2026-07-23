"use client";

import type { ReactNode } from "react";

import { LifeLabCompactSourceMeta } from "@/components/life-lab/life-lab-compact-source-meta";
import { LifeLabContentHeader } from "@/components/life-lab/life-lab-content-header";
import { LifeLabDetailsDisclosure } from "@/components/life-lab/life-lab-details-disclosure";
import { LifeLabModeTabs } from "@/components/life-lab/life-lab-mode-tabs";
import { LifeLabNoteListen } from "@/components/life-lab/life-lab-note-listen";
import { LifeLabNoteMoreMenu } from "@/components/life-lab/life-lab-note-more-menu";
import { LifeLabPrimaryActions } from "@/components/life-lab/life-lab-primary-actions";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import type { LifeLabNote, LifeLabSectionId } from "@/lib/life-lab/constants";
import { collectAllMetadataChips } from "@/lib/life-lab/metadata-chips";
import { resolveStudyStatusLabel } from "@/lib/life-lab/study-status";
import {
  getSourcePlatformLabel,
  resolveLifeLabSourceUrl,
} from "@/lib/life-lab/source-url";
import {
  collectLifeLabImageDetailRows,
  extractVisualAnchorSection,
} from "@/lib/life-lab/note-image";
import {
  lifeLabNoteDisplayTitle,
  lifeLabNoteDisplayTitleDiffers,
} from "@/lib/life-lab/youtube-learning";
import { lectureNoteSourceLabel } from "@/lib/life-lab/lecture-notes";
import { resolveRawStandaloneChannelName } from "@/lib/life-lab/standalone-channel";
import type { PlaylistVideoNavigation } from "@/lib/life-lab/playlist-index";
import { isYoutubeVideoNote } from "@/lib/life-lab/playlist-index";
import { resolveLifeLabNoteBackLink } from "@/lib/life-lab/note-back-link";
import { isLifeLabNoteCoachingTabEnabled } from "@/lib/life-lab/note-mode-tabs";

type LifeLabNoteDetailHeaderProps = {
  note: LifeLabNote;
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  playlistNav?: PlaylistVideoNavigation | null;
  readAloudPreferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  archived?: boolean;
  activeMode?: "overview" | "flashcards" | "coaching";
  showCoaching?: boolean;
  hero?: ReactNode;
};

function MetadataChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent-cream/60 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

function NoteDetailsBody({
  note,
  sectionId,
  sectionLabel,
}: {
  note: LifeLabNote;
  sectionId: LifeLabSectionId;
  sectionLabel: string;
}) {
  const showFullTitle = lifeLabNoteDisplayTitleDiffers(note);
  const dateLine = note.dateLabel ?? note.modifiedAtLabel;
  const lectureSourceLabel = lectureNoteSourceLabel({
    relativePath: note.relativePath,
    metadata: note.metadata,
  });
  const statusLabel = resolveStudyStatusLabel(note.metadata);
  const isYoutube = isYoutubeVideoNote(note);
  const resolvedSourceUrl = isYoutube
    ? resolveLifeLabSourceUrl({ metadata: note.metadata })
    : null;
  const allChips = collectAllMetadataChips(note.metadata, {
    sectionId,
    sectionLabel,
    subfolderLabel: note.subfolderLabel,
    variant: "detail-mobile",
  });
  const imageDetailRows = collectLifeLabImageDetailRows({
    metadata: note.metadata,
    visualAnchorContent: extractVisualAnchorSection(note.content),
  });

  return (
    <>
      {statusLabel ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Study status
          </p>
          <p className="text-sm text-foreground">{statusLabel}</p>
        </div>
      ) : null}
      {dateLine ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Date
          </p>
          <p className="text-sm text-foreground">{dateLine}</p>
        </div>
      ) : null}
      {lectureSourceLabel ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Source
          </p>
          <p className="text-sm text-foreground">{lectureSourceLabel}</p>
        </div>
      ) : null}
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
        <div className="space-y-2">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allChips.map((label) => (
              <MetadataChip key={label} label={label} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function LifeLabNoteDetailsSection({
  note,
  sectionId,
  sectionLabel,
}: {
  note: LifeLabNote;
  sectionId: LifeLabSectionId;
  sectionLabel: string;
}) {
  const showFullTitle = lifeLabNoteDisplayTitleDiffers(note);
  const dateLine = note.dateLabel ?? note.modifiedAtLabel;
  const lectureSourceLabel = lectureNoteSourceLabel({
    relativePath: note.relativePath,
    metadata: note.metadata,
  });
  const statusLabel = resolveStudyStatusLabel(note.metadata);
  const isYoutube = isYoutubeVideoNote(note);
  const resolvedSourceUrl = isYoutube
    ? resolveLifeLabSourceUrl({ metadata: note.metadata })
    : null;
  const allChips = collectAllMetadataChips(note.metadata, {
    sectionId,
    sectionLabel,
    subfolderLabel: note.subfolderLabel,
    variant: "detail-mobile",
  });
  const imageDetailRows = collectLifeLabImageDetailRows({
    metadata: note.metadata,
    visualAnchorContent: extractVisualAnchorSection(note.content),
  });
  const showDetails =
    allChips.length > 0 ||
    showFullTitle ||
    Boolean(resolvedSourceUrl) ||
    imageDetailRows.length > 0 ||
    Boolean(statusLabel) ||
    Boolean(lectureSourceLabel) ||
    Boolean(dateLine);

  if (!showDetails) {
    return null;
  }

  return (
    <LifeLabDetailsDisclosure tagCount={allChips.length} className="mt-6">
      <NoteDetailsBody
        note={note}
        sectionId={sectionId}
        sectionLabel={sectionLabel}
      />
    </LifeLabDetailsDisclosure>
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
  activeMode = "overview",
  showCoaching = false,
  hero,
}: LifeLabNoteDetailHeaderProps) {
  const displayTitle = lifeLabNoteDisplayTitle(note);
  const dateLine = note.dateLabel ?? note.modifiedAtLabel;
  const lectureSourceLabel = lectureNoteSourceLabel({
    relativePath: note.relativePath,
    metadata: note.metadata,
  });
  const flashcardCount =
    note.flashcards?.length ?? note.flashcardCount ?? 0;
  const showFlashcards = flashcardCount > 0;
  const isYoutube = isYoutubeVideoNote(note);
  const channelLabel = isYoutube
    ? resolveRawStandaloneChannelName(note.metadata)
    : null;
  const resolvedSourceUrl = isYoutube
    ? resolveLifeLabSourceUrl({ metadata: note.metadata })
    : null;
  const platformLabel = resolvedSourceUrl
    ? getSourcePlatformLabel(resolvedSourceUrl)
    : null;
  const back = resolveLifeLabNoteBackLink({
    sectionId,
    sectionLabel,
    playlistNav,
  });
  const noteHref = `/life-lab/${sectionId}/${note.slug}`;
  const coachingTabEnabled =
    showCoaching && isLifeLabNoteCoachingTabEnabled();

  const modeTabs = [
    { id: "overview", label: "Overview", href: noteHref },
    ...(showFlashcards
      ? [
          {
            id: "flashcards",
            label: "Flashcards",
            href: `${noteHref}?view=flashcards`,
          },
        ]
      : []),
    ...(coachingTabEnabled
      ? [{ id: "coaching", label: "Coaching", href: "/coaching" }]
      : []),
  ];

  return (
    <div className="space-y-3 md:space-y-4" data-life-lab-note-detail-header="">
      <LifeLabContentHeader
        backHref={back.href}
        backLabel={back.label}
        title={displayTitle}
        metadata={
          isYoutube ? (
            <LifeLabCompactSourceMeta
              channelLabel={channelLabel}
              platformLabel={platformLabel}
              dateLabel={dateLine}
              sourceHref={resolvedSourceUrl}
            />
          ) : (
            <LifeLabCompactSourceMeta
              platformLabel={lectureSourceLabel ?? sectionLabel}
              dateLabel={dateLine}
            />
          )
        }
      />

      {hero}

      {modeTabs.length > 1 ? (
        <LifeLabModeTabs tabs={modeTabs} activeId={activeMode} />
      ) : null}

      <LifeLabPrimaryActions
        listen={
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
        }
        more={
          <LifeLabNoteMoreMenu
            note={note}
            sectionId={sectionId}
            archived={archived}
          />
        }
      />

      {archived ? (
        <span className="inline-flex text-xs text-muted">Archived</span>
      ) : null}
    </div>
  );
}
