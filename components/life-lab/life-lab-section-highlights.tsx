import Link from "next/link";

import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";

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
          <li key={note.slug}>
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/30"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {note.title}
              </span>
              <span className="shrink-0 text-xs font-medium text-muted">
                Resume →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

type LifeLabRecentlyAddedProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

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
          <li key={note.slug}>
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/30"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {note.title}
              </span>
              {note.dateLabel ?? note.modifiedAtLabel ? (
                <span className="shrink-0 text-xs text-muted-light">
                  {note.dateLabel ?? note.modifiedAtLabel}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
