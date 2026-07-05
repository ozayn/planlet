"use client";

import Link from "next/link";
import { useState } from "react";

import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabNoteCardMeta } from "@/components/life-lab/life-lab-note-card-meta";
import { LifeLabNoteCardDevMenu } from "@/components/life-lab/life-lab-note-card-dev-menu";
import type {
  LifeLabListingDiagnostic,
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { groupDisclosureSummary } from "@/lib/life-lab/organization";
import {
  dictionaryCategoryLabel,
  resolveDictionaryCategory,
} from "@/lib/life-lab/learning-dictionary";

type LifeLabSectionNotesProps = {
  sectionId: LifeLabSectionId;
  groups: LifeLabNoteGroup[];
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  refreshHref: string;
};

type LifeLabNoteCardProps = {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
  group: LifeLabNoteGroup;
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

function shouldShowSubfolderLabel(
  note: LifeLabNoteSummary,
  group: LifeLabNoteGroup,
): boolean {
  if (!note.subfolderLabel) {
    return false;
  }

  const subfolder = note.subfolderLabel.toLowerCase();

  // Month-split groups use ids like "daily:2026-07"; the subfolder is implied.
  return group.id !== subfolder && !group.id.startsWith(`${subfolder}:`);
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

function LifeLabDictionaryNoteCard({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const category = resolveDictionaryCategory(note);
  const categoryLabel = category ? dictionaryCategoryLabel(category) : null;

  return (
    <li>
      <div className="ui-card-padded relative !p-3 transition-colors hover:bg-accent-cream/25">
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {categoryLabel ? <CategoryBadge label={categoryLabel} /> : null}
              <LifeLabNoteCardMeta sectionId={sectionId} note={note} />
            </div>
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="block text-base font-semibold leading-snug text-foreground transition-colors hover:text-foreground/80"
            >
              {note.title}
            </Link>
            <LifeLabMetadataChips
              metadata={note.metadata}
              sectionId={sectionId}
              subfolderLabel={note.subfolderLabel}
              variant="card"
              className="mt-1.5"
            />
            {note.excerpt ? (
              <Link
                href={`/life-lab/${sectionId}/${note.slug}`}
                className="mt-1.5 block text-sm leading-relaxed text-muted line-clamp-2"
              >
                {note.excerpt}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="absolute right-3 top-3">
          <LifeLabNoteCardDevMenu sectionId={sectionId} note={note} />
        </div>
      </div>
    </li>
  );
}

function LifeLabNoteCard({ sectionId, note, group }: LifeLabNoteCardProps) {
  return (
    <li>
      <div className="ui-card-padded relative !p-3.5 transition-colors hover:bg-accent-cream/25">
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0 flex-1">
            {shouldShowSubfolderLabel(note, group) ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
                {note.subfolderLabel}
              </p>
            ) : null}
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="block text-base font-semibold text-foreground transition-colors hover:text-foreground/80"
            >
              {note.title}
            </Link>
            <LifeLabMetadataChips
              metadata={note.metadata}
              sectionId={sectionId}
              groupId={group.id}
              groupLabel={group.label}
              subfolderLabel={note.subfolderLabel}
              variant="card"
              className="mt-1.5"
            />
            <LifeLabNoteCardMeta
              sectionId={sectionId}
              note={note}
              className="mt-2"
            />
            {note.excerpt ? (
              <Link
                href={`/life-lab/${sectionId}/${note.slug}`}
                className="mt-1.5 block text-sm leading-relaxed text-muted line-clamp-2"
              >
                {note.excerpt}
              </Link>
            ) : null}
          </div>
          {note.dateLabel ?? note.modifiedAtLabel ? (
            <span className="shrink-0 text-xs text-muted-light">
              {note.dateLabel ?? note.modifiedAtLabel}
            </span>
          ) : null}
        </div>
        <div className="absolute right-3 top-3">
          <LifeLabNoteCardDevMenu sectionId={sectionId} note={note} />
        </div>
      </div>
    </li>
  );
}

const GROUP_INITIAL_VISIBLE = 10;

function LifeLabNoteList({
  sectionId,
  group,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = group.notes.length > GROUP_INITIAL_VISIBLE;
  const visibleNotes =
    hasOverflow && !expanded
      ? group.notes.slice(0, GROUP_INITIAL_VISIBLE)
      : group.notes;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visibleNotes.map((note) =>
          sectionId === "learning-dictionary" ? (
            <LifeLabDictionaryNoteCard
              key={note.slug}
              sectionId={sectionId}
              note={note}
            />
          ) : (
            <LifeLabNoteCard
              key={note.slug}
              sectionId={sectionId}
              note={note}
              group={group}
            />
          ),
        )}
      </ul>
      {hasOverflow ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground"
        >
          {expanded
            ? "Show less"
            : `Show ${group.notes.length - GROUP_INITIAL_VISIBLE} more`}
        </button>
      ) : null}
    </div>
  );
}

function LifeLabNoteGroupSection({
  sectionId,
  group,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
}) {
  const hidePrimaryHeading =
    sectionId === "reading-briefs" &&
    group.variant === "primary" &&
    group.notes.length === 1;

  if (group.variant === "primary") {
    return (
      <section className={hidePrimaryHeading ? "space-y-0" : "space-y-2"}>
        {hidePrimaryHeading ? null : (
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {group.label}
          </h2>
        )}
        <LifeLabNoteList sectionId={sectionId} group={group} />
      </section>
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        {groupDisclosureSummary(group)}
      </summary>
      <div className="ui-settings-details-body">
        <LifeLabNoteList sectionId={sectionId} group={group} />
      </div>
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
    <div className="space-y-4">
      {groups.map((group) => (
        <LifeLabNoteGroupSection
          key={group.id}
          sectionId={sectionId}
          group={group}
        />
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
