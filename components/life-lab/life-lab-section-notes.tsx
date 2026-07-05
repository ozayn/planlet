import Link from "next/link";

import { LifeLabNoteCardDevMenu } from "@/components/life-lab/life-lab-note-card-dev-menu";
import type {
  LifeLabListingDiagnostic,
  LifeLabNoteGroup,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";

type LifeLabSectionNotesProps = {
  sectionId: LifeLabSectionId;
  groups: LifeLabNoteGroup[];
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  refreshHref: string;
};

function LifeLabListingDiagnosticPanel({
  diagnostic,
  refreshHref,
}: {
  diagnostic: LifeLabListingDiagnostic;
  refreshHref: string;
}) {
  const rows = [
    { label: "Files found", value: String(diagnostic.fileCount) },
    { label: "Folders traversed", value: String(diagnostic.foldersTraversed) },
    { label: "Max depth used", value: String(diagnostic.maxDepthUsed) },
    {
      label: "Pagination occurred",
      value: diagnostic.paginationOccurred ? "Yes" : "No",
    },
  ];

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Life Lab listing debug (dev only)
      </summary>
      <dl className="ui-settings-details-body">
        {rows.map((row) => (
          <div key={row.label} className="ui-settings-info-row">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-end text-foreground">{row.value}</dd>
          </div>
        ))}
        <div className="pt-2">
          <Link
            href={refreshHref}
            className="text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            Refresh Drive listing
          </Link>
        </div>
      </dl>
    </details>
  );
}

export function LifeLabSectionNotes({
  sectionId,
  groups,
  listingDiagnostic,
  showDiagnostics,
  refreshHref,
}: LifeLabSectionNotesProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.id} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {group.label}
          </h2>
          <ul className="space-y-2">
            {group.notes.map((note) => (
              <li key={note.slug}>
                <div className="ui-card-padded relative transition-colors hover:bg-accent-cream/25">
                  <Link
                    href={`/life-lab/${sectionId}/${note.slug}`}
                    className="block pr-10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {note.subfolderLabel ? (
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
                            {note.subfolderLabel}
                          </p>
                        ) : null}
                        <h3 className="text-base font-semibold text-foreground">
                          {note.title}
                        </h3>
                        {note.excerpt ? (
                          <p className="mt-1 text-sm leading-relaxed text-muted">
                            {note.excerpt}
                          </p>
                        ) : null}
                      </div>
                      {note.dateLabel ?? note.modifiedAtLabel ? (
                        <span className="shrink-0 text-xs text-muted-light">
                          {note.dateLabel ?? note.modifiedAtLabel}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  <div className="absolute right-3 top-3">
                    <LifeLabNoteCardDevMenu sectionId={sectionId} note={note} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {showDiagnostics && listingDiagnostic ? (
        <LifeLabListingDiagnosticPanel
          diagnostic={listingDiagnostic}
          refreshHref={refreshHref}
        />
      ) : null}
    </div>
  );
}
