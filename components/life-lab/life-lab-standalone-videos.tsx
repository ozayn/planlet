"use client";

import Link from "next/link";
import { useState } from "react";

import { PlaylistVideoThumbnail } from "@/components/life-lab/playlist-video-thumbnail";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { resolvePlaylistVideoRowThumbnail } from "@/lib/life-lab/playlist-video-thumbnail";

type LifeLabStandaloneVideosProps = {
  sectionId: LifeLabSectionId;
  previewNotes: LifeLabNoteSummary[];
  allNotes: LifeLabNoteSummary[];
  totalCount: number;
};

function standaloneThumbnail(note: LifeLabNoteSummary) {
  return (
    resolvePlaylistVideoRowThumbnail({
      metadata: note.metadata,
      videoUrl: note.metadata?.sourceUrl ?? null,
      title: note.title,
    }) ?? resolveLifeLabNoteImage(note.metadata)
  );
}

function StandaloneVideoRow({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const thumbnail = standaloneThumbnail(note);
  const dateLabel = note.dateLabel ?? note.modifiedAtLabel;

  return (
    <li>
      <Link
        href={`/life-lab/${sectionId}/${note.slug}`}
        className="group flex items-start gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {thumbnail ? (
          <PlaylistVideoThumbnail
            image={thumbnail}
            title={note.title}
            className="w-[4.5rem] shrink-0"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground md:line-clamp-1">
            {note.title}
          </p>
          {dateLabel ? (
            <p className="mt-0.5 text-xs text-muted-light">{dateLabel}</p>
          ) : null}
        </div>
      </Link>
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
      <ul className="space-y-1">
        {visibleNotes.map((note) => (
          <StandaloneVideoRow key={note.slug} sectionId={sectionId} note={note} />
        ))}
      </ul>
      {hasOverflow && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          View all
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
