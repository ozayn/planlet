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
import { selectCardPreview } from "@/lib/life-lab/card-preview";
import {
  dictionaryCategoryLabel,
  resolveDictionaryCategory,
} from "@/lib/life-lab/learning-dictionary";
import { isPlaylistIndexNote } from "@/lib/life-lab/playlist-index";
import { groupDisclosureSummary } from "@/lib/life-lab/organization";

type LifeLabSectionNotesProps = {
  sectionId: LifeLabSectionId;
  groups: LifeLabNoteGroup[];
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  refreshHref: string;
  searchQuery?: string;
};

type LifeLabNoteCardProps = {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
  group: LifeLabNoteGroup;
  searchQuery?: string;
};

const GROUP_INITIAL_VISIBLE = 3;

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

  return group.id !== subfolder && !group.id.startsWith(`${subfolder}:`);
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

function isPlaylistIndexCard(
  sectionId: LifeLabSectionId,
  note: LifeLabNoteSummary,
): boolean {
  return isPlaylistIndexNote({
    sectionId,
    relativePath: note.relativePath,
    subfolderLabel: note.subfolderLabel,
    metadata: note.metadata,
  });
}

function CardPreview({
  note,
  searchQuery,
}: {
  note: LifeLabNoteSummary;
  searchQuery?: string;
}) {
  const preview = selectCardPreview(note, { searchQuery });

  if (!preview) {
    return null;
  }

  return (
    <p className="line-clamp-2 text-xs leading-relaxed text-muted md:line-clamp-1">
      {preview}
    </p>
  );
}

function LifeLabPlaylistIndexCard({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const progress = note.excerpt?.trim();

  return (
    <li>
      <div className="relative rounded-lg border border-border/50 bg-surface/70 p-2.5 transition-colors hover:bg-accent-cream/20">
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="min-w-0 flex-1 space-y-1">
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="block line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-foreground/80"
            >
              {note.title}
            </Link>
            {progress ? (
              <p className="text-xs text-muted">{progress}</p>
            ) : null}
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="inline-flex rounded-full border border-border/70 px-2.5 py-1 text-[0.6875rem] font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
            >
              Open playlist
            </Link>
          </div>
          {note.dateLabel ?? note.modifiedAtLabel ? (
            <span className="shrink-0 text-[0.6875rem] text-muted-light">
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

function LifeLabDictionaryNoteCard({
  sectionId,
  note,
  searchQuery,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
  searchQuery?: string;
}) {
  const category = resolveDictionaryCategory(note);
  const categoryLabel = category ? dictionaryCategoryLabel(category) : null;

  return (
    <li>
      <div className="ui-card-padded relative !p-2.5 md:!p-3">
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {categoryLabel ? <CategoryBadge label={categoryLabel} /> : null}
              {note.dateLabel ?? note.modifiedAtLabel ? (
                <span className="text-[0.6875rem] text-muted-light">
                  {note.dateLabel ?? note.modifiedAtLabel}
                </span>
              ) : null}
            </div>
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="block line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-foreground/80"
            >
              {note.title}
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <LifeLabNoteCardMeta sectionId={sectionId} note={note} />
              <LifeLabMetadataChips
                metadata={note.metadata}
                sectionId={sectionId}
                subfolderLabel={note.subfolderLabel}
                variant="card"
              />
            </div>
            <CardPreview note={note} searchQuery={searchQuery} />
          </div>
        </div>
        <div className="absolute right-2.5 top-2.5">
          <LifeLabNoteCardDevMenu sectionId={sectionId} note={note} />
        </div>
      </div>
    </li>
  );
}

function LifeLabNoteCard({
  sectionId,
  note,
  group,
  searchQuery,
}: LifeLabNoteCardProps) {
  if (isPlaylistIndexCard(sectionId, note)) {
    return <LifeLabPlaylistIndexCard sectionId={sectionId} note={note} />;
  }

  return (
    <li>
      <div className="ui-card-padded relative !p-2.5 transition-colors hover:bg-accent-cream/25 md:!p-3">
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="min-w-0 flex-1 space-y-1">
            {shouldShowSubfolderLabel(note, group) ? (
              <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
                {note.subfolderLabel}
              </p>
            ) : null}
            <Link
              href={`/life-lab/${sectionId}/${note.slug}`}
              className="block line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-foreground/80 md:line-clamp-1"
            >
              {note.title}
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <LifeLabNoteCardMeta sectionId={sectionId} note={note} />
              <LifeLabMetadataChips
                metadata={note.metadata}
                sectionId={sectionId}
                groupId={group.id}
                groupLabel={group.label}
                subfolderLabel={note.subfolderLabel}
                variant="card"
              />
            </div>
            <CardPreview note={note} searchQuery={searchQuery} />
          </div>
          {note.dateLabel ?? note.modifiedAtLabel ? (
            <span className="shrink-0 text-[0.6875rem] text-muted-light">
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

function LifeLabNoteList({
  sectionId,
  group,
  searchQuery,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
  searchQuery?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = group.notes.length > GROUP_INITIAL_VISIBLE;
  const visibleNotes =
    hasOverflow && !expanded
      ? group.notes.slice(0, GROUP_INITIAL_VISIBLE)
      : group.notes;

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {visibleNotes.map((note) =>
          sectionId === "learning-dictionary" ? (
            <LifeLabDictionaryNoteCard
              key={note.slug}
              sectionId={sectionId}
              note={note}
              searchQuery={searchQuery}
            />
          ) : (
            <LifeLabNoteCard
              key={note.slug}
              sectionId={sectionId}
              note={note}
              group={group}
              searchQuery={searchQuery}
            />
          ),
        )}
      </ul>
      {hasOverflow ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground"
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
  searchQuery,
}: {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
  searchQuery?: string;
}) {
  const hidePrimaryHeading =
    sectionId === "reading-briefs" &&
    group.variant === "primary" &&
    group.notes.length === 1;

  if (group.variant === "primary") {
    return (
      <section className={hidePrimaryHeading ? "space-y-0" : "space-y-1.5"}>
        {hidePrimaryHeading ? null : (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {group.label}
          </h2>
        )}
        <LifeLabNoteList
          sectionId={sectionId}
          group={group}
          searchQuery={searchQuery}
        />
      </section>
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        {groupDisclosureSummary(group)}
      </summary>
      <div className="ui-settings-details-body">
        <LifeLabNoteList
          sectionId={sectionId}
          group={group}
          searchQuery={searchQuery}
        />
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
  searchQuery,
}: LifeLabSectionNotesProps) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <LifeLabNoteGroupSection
          key={group.id}
          sectionId={sectionId}
          group={group}
          searchQuery={searchQuery}
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
