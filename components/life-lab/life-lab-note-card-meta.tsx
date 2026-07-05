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
    "slug" | "metadata" | "hasFlashcards" | "flashcardCount"
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
  const showStudy = noteShowsFlashcardAction(note);

  if (!statusLabel && !showStudy) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {statusLabel ? <StudyStatusBadge label={statusLabel} /> : null}
      {showStudy ? (
        <Link
          href={`/life-lab/${sectionId}/${note.slug}/study`}
          className="rounded-full bg-accent-cream px-2.5 py-0.5 text-[0.6875rem] font-medium text-foreground transition-colors hover:bg-accent-cream/80"
        >
          Study
          {note.flashcardCount ? ` · ${note.flashcardCount}` : ""}
        </Link>
      ) : null}
    </div>
  );
}
