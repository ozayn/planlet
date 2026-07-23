"use client";

import Link from "next/link";

import { LifeLabMediaThumbnail } from "@/components/life-lab/life-lab-media-thumbnail";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { resolveLifeLabThumbnail } from "@/lib/life-lab/thumbnail";

type LifeLabVideoRowProps = {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
  image?: ResolvedLifeLabNoteImage | null;
  statusLabel?: string | null;
};

export function LifeLabVideoRow({
  sectionId,
  note,
  image,
  statusLabel,
}: LifeLabVideoRowProps) {
  const thumbnail = image ?? resolveLifeLabThumbnail(note);
  const dateLabel = note.dateLabel ?? note.modifiedAtLabel;
  const mobileMeta = [dateLabel, statusLabel].filter(Boolean).join(" · ");

  return (
    <li>
      <Link
        href={`/life-lab/${sectionId}/${note.slug}`}
        prefetch
        data-life-lab-note-link=""
        className="group flex items-start gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <LifeLabMediaThumbnail image={thumbnail} title={note.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 md:items-center">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground md:line-clamp-2">
              {note.title}
            </p>
            {dateLabel ? (
              <span className="hidden shrink-0 text-sm text-muted md:block">
                {dateLabel}
              </span>
            ) : null}
          </div>
          {statusLabel ? (
            <p className="mt-0.5 hidden text-sm text-muted md:block">
              {statusLabel}
            </p>
          ) : null}
          {mobileMeta ? (
            <p className="mt-0.5 text-sm text-muted md:hidden">{mobileMeta}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
