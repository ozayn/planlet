"use client";

import Link from "next/link";
import { useState } from "react";

import { LifeLabNoteCardMeta } from "@/components/life-lab/life-lab-note-card-meta";
import { LifeLabNoteCardDevMenu } from "@/components/life-lab/life-lab-note-card-dev-menu";
import { LifeLabNoteImageFigure } from "@/components/life-lab/life-lab-note-image";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import { selectCardPreview } from "@/lib/life-lab/card-preview";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";

type LifeLabStandaloneVideosProps = {
  sectionId: LifeLabSectionId;
  previewNotes: LifeLabNoteSummary[];
  allNotes: LifeLabNoteSummary[];
  totalCount: number;
};

function StandaloneVideoCard({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const preview = selectCardPreview(note);
  const noteImage = resolveLifeLabNoteImage(note.metadata);

  return (
    <li>
      <div className="relative rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent-cream/20">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {noteImage ? (
              <LifeLabNoteImageFigure
                image={noteImage}
                variant="thumbnail"
                fallbackTitle={note.title}
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-1">
              <Link
                href={`/life-lab/${sectionId}/${note.slug}`}
                className="block line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-foreground/80 md:line-clamp-1"
              >
                {note.title}
              </Link>
              <LifeLabNoteCardMeta sectionId={sectionId} note={note} />
              {preview ? (
                <p className="line-clamp-1 text-xs leading-relaxed text-muted">
                  {preview}
                </p>
              ) : null}
            </div>
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

export function LifeLabStandaloneVideos({
  sectionId,
  previewNotes,
  allNotes,
  totalCount,
}: LifeLabStandaloneVideosProps) {
  const [expanded, setExpanded] = useState(false);

  if (totalCount === 0) {
    return null;
  }

  const visibleNotes = expanded ? allNotes : previewNotes;
  const hasOverflow = totalCount > previewNotes.length;

  return (
    <section className="space-y-2">
      <div className="space-y-0.5">
        <h2 className="text-sm font-medium text-muted">Standalone videos</h2>
        <p className="text-xs text-muted-light">
          Videos not currently assigned to a playlist.
        </p>
      </div>
      <ul className="space-y-2">
        {visibleNotes.map((note) => (
          <StandaloneVideoCard key={note.slug} sectionId={sectionId} note={note} />
        ))}
      </ul>
      {hasOverflow && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          View all standalone videos →
        </button>
      ) : expanded && hasOverflow ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          Show less
        </button>
      ) : null}
    </section>
  );
}
