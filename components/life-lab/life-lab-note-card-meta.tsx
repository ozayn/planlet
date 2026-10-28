import Link from "next/link";

import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  noteShowsFlashcardAction,
  resolveStudyStatusLabel,
} from "@/lib/life-lab/study-status";

type LifeLabNoteCardMetaProps = {
  sectionId: LifeLabSectionId;
  note: Pick<
    LifeLabNoteSummary,
    | "slug"
    | "metadata"
    | "hasFlashcards"
    | "flashcardCount"
    | "bilingualAvailabilityLabel"
  >;
  className?: string;
};

function StudyStatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

export function LifeLabNoteCardMeta({
  sectionId,
  note,
  className = "",
}: LifeLabNoteCardMetaProps) {
  const statusLabel = resolveStudyStatusLabel(note.metadata);
  const bilingualLabel = note.bilingualAvailabilityLabel?.trim() || null;
  const showStudy = noteShowsFlashcardAction(note);

  if (!statusLabel && !showStudy && !bilingualLabel) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {bilingualLabel ? (
        <span className="text-[0.6875rem] text-muted">{bilingualLabel}</span>
      ) : null}
      {statusLabel ? <StudyStatusBadge label={statusLabel} /> : null}
      {showStudy ? (
        <Link
          href={`/life-lab/${sectionId}/${note.slug}?view=flashcards`}
          className="rounded-full bg-accent-cream px-2.5 py-0.5 text-[0.6875rem] font-medium text-foreground transition-colors hover:bg-accent-cream/80"
        >
          Flashcards
          {note.flashcardCount ? ` · ${note.flashcardCount}` : ""}
        </Link>
      ) : null}
    </div>
  );
}
