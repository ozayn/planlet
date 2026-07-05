"use client";

import Link from "next/link";

import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabNoteReadAloud } from "@/components/life-lab/life-lab-note-read-aloud";
import type { LifeLabNote, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  collectAllMetadataChips,
  selectVisibleMetadataChips,
} from "@/lib/life-lab/metadata-chips";
import { readingBriefDisplayTitle } from "@/lib/life-lab/reading-briefs";
import { resolveStudyStatusLabel } from "@/lib/life-lab/study-status";

type LifeLabReadingBriefHeaderProps = {
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  note: LifeLabNote;
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

export function LifeLabReadingBriefHeader({
  sectionId,
  sectionLabel,
  note,
}: LifeLabReadingBriefHeaderProps) {
  const displayTitle = readingBriefDisplayTitle(note.title);
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
          className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground md:text-xl"
          dir="auto"
        >
          {displayTitle}
        </h1>
        <p className="text-xs text-muted" dir="auto">
          {[dateLine, sectionLabel].filter(Boolean).join(" · ")}
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
        {allChips.length > mobileVisible.length ? (
          <details className="ui-settings-details group md:hidden">
            <summary className="ui-settings-details-summary !inline-flex !rounded-full !border !border-border/70 !bg-transparent !py-1.5 !px-3 !text-xs !font-medium !normal-case !tracking-normal !text-muted hover:!bg-accent-cream/50 hover:!text-foreground">
              More
            </summary>
            <div className="ui-settings-details-body">
              <div className="flex flex-wrap gap-1.5">
                {allChips.map((label) => (
                  <MetadataChip key={label} label={label} />
                ))}
              </div>
            </div>
          </details>
        ) : null}
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
        <details className="ui-settings-details group md:hidden">
          <summary className="ui-settings-details-summary">
            Details · {allChips.length} tags
          </summary>
          <div className="ui-settings-details-body">
            <div className="flex flex-wrap gap-1.5">
              {allChips.map((label) => (
                <MetadataChip key={label} label={label} />
              ))}
            </div>
          </div>
        </details>
      ) : null}

      {allChips.length > 0 ? (
        <details className="ui-settings-details group hidden md:block">
          <summary className="ui-settings-details-summary">
            Details · {allChips.length} tags
          </summary>
          <div className="ui-settings-details-body">
            <div className="flex flex-wrap gap-1.5">
              {allChips.map((label) => (
                <MetadataChip key={label} label={label} />
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <LifeLabNoteReadAloud
        title={note.title}
        content={note.content}
        compact
      />
    </header>
  );
}
