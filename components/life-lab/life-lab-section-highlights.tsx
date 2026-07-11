import Link from "next/link";

import { LifeLabMediaThumbnail } from "@/components/life-lab/life-lab-media-thumbnail";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import { resolveLifeLabThumbnail } from "@/lib/life-lab/thumbnail";

type LifeLabRecentlyAddedProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

function RecentlyAddedRow({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const thumbnail = resolveLifeLabThumbnail(note);
  const dateLabel = note.dateLabel ?? note.modifiedAtLabel;

  return (
    <li>
      <Link
        href={`/life-lab/${sectionId}/${note.slug}`}
        className="group flex items-start gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <LifeLabMediaThumbnail image={thumbnail} title={note.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 sm:items-center">
            <p className="line-clamp-2 text-sm leading-snug text-foreground sm:line-clamp-1 sm:truncate">
              {note.title}
            </p>
            {dateLabel ? (
              <span className="hidden shrink-0 text-xs text-muted-light sm:block">
                {dateLabel}
              </span>
            ) : null}
          </div>
          {dateLabel ? (
            <p className="mt-0.5 text-xs text-muted-light sm:hidden">{dateLabel}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

type LifeLabContinueLearningProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

export function LifeLabContinueLearning({
  sectionId,
  notes,
}: LifeLabContinueLearningProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted">Continue learning</h2>
      <ul className="space-y-1">
        {notes.map((note) => (
          <RecentlyAddedRow key={note.slug} sectionId={sectionId} note={note} />
        ))}
      </ul>
    </section>
  );
}

export function LifeLabRecentlyAdded({
  sectionId,
  notes,
}: LifeLabRecentlyAddedProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted">Recently added</h2>
      <ul className="space-y-1">
        {notes.map((note) => (
          <RecentlyAddedRow key={note.slug} sectionId={sectionId} note={note} />
        ))}
      </ul>
    </section>
  );
}
