"use client";

import Link from "next/link";

import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabNoteDevToolbar } from "@/components/life-lab/life-lab-note-dev-toolbar";
import { LifeLabNoteReadAloud } from "@/components/life-lab/life-lab-note-read-aloud";
import type { LifeLabNote, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  collectAllMetadataChips,
  selectVisibleMetadataChips,
} from "@/lib/life-lab/metadata-chips";
import { resolveStudyStatusLabel } from "@/lib/life-lab/study-status";
import {
  lifeLabNoteDisplayTitle,
  lifeLabNoteDisplayTitleDiffers,
} from "@/lib/life-lab/youtube-learning";

type LifeLabNoteDetailHeaderProps = {
  note: LifeLabNote;
  sectionId: LifeLabSectionId;
  sectionLabel: string;
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
}: LifeLabNoteDetailHeaderProps) {
  const displayTitle = lifeLabNoteDisplayTitle(note);
  const showFullTitle = lifeLabNoteDisplayTitleDiffers(note);
  const dateLine = note.dateLabel ?? note.modifiedAtLabel;
  const statusLabel = resolveStudyStatusLabel(note.metadata);
  const flashcardCount =
    note.flashcards?.length ?? note.flashcardCount ?? 0;
  const showStudy = flashcardCount > 0;

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

  return (
    <header className="mb-3 space-y-2 border-b border-border/50 pb-3 md:mb-4 md:space-y-3 md:pb-4">
      <div className="space-y-1">
        <h1
          className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] md:text-[1.625rem] md:leading-tight"
          dir="auto"
        >
          {displayTitle}
        </h1>
        <p className="text-xs text-muted" dir="auto">
          {[sectionLabel, dateLine].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showStudy ? (
          <Link
            href={`/life-lab/${sectionId}/${note.slug}/study`}
            className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
          >
            Study · {flashcardCount} cards
          </Link>
        ) : null}
        <Link
          href={`/life-lab/${sectionId}`}
          className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
        >
          Back
        </Link>
        <LifeLabNoteDevToolbar note={note} />
      </div>

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

      {allChips.length > 0 ? (
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
            <div className="flex flex-wrap gap-1.5">
              {allChips.map((label) => (
                <MetadataChip key={label} label={label} />
              ))}
            </div>
          </div>
        </details>
      ) : showFullTitle ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary">Details</summary>
          <div className="ui-settings-details-body">
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Full title
              </p>
              <p className="text-sm leading-relaxed text-foreground" dir="auto">
                {note.title}
              </p>
            </div>
          </div>
        </details>
      ) : null}

      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary">Audio</summary>
        <div className="ui-settings-details-body">
          <LifeLabNoteReadAloud
            title={note.title}
            content={note.content}
            compact
          />
        </div>
      </details>
    </header>
  );
}
