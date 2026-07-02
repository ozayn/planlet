"use client";

import { PrivateEntryActionsMenu } from "@/components/plans/private-entry-actions-menu";
import type { SerializedLearningEntry } from "@/lib/learning-journey/constants";
import { ACTION_LABELS } from "@/lib/action-labels";

type LearningEntryCardProps = {
  entry: SerializedLearningEntry;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function previewText(value: string | null, maxLength = 180): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength - 1).trim()}…`
    : trimmed;
}

function normalizeForCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldShowSummaryPreview(entry: SerializedLearningEntry): boolean {
  const title = normalizeForCompare(entry.title);
  const summary = normalizeForCompare(entry.summary);

  if (!summary || summary === title) {
    return false;
  }

  return !summary.startsWith(title);
}

function MetadataPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-soft bg-surface/80 px-2.5 py-1 text-[0.6875rem] text-muted">
      {label}
    </span>
  );
}

export function LearningEntryCard({
  entry,
  disabled = false,
  onEdit,
  onDelete,
}: LearningEntryCardProps) {
  const summaryPreview = shouldShowSummaryPreview(entry)
    ? previewText(entry.summary)
    : null;
  const notesPreview = previewText(entry.notes, 140);
  const sourceLabel = [entry.sourceTypeLabel, entry.sourceName]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
            {entry.learnedAtLabel}
          </p>
          <h3 className="text-base font-semibold text-foreground" dir="auto">
            {entry.title}
          </h3>
        </div>
        <div className="ui-item-card-actions shrink-0">
          <PrivateEntryActionsMenu
            onEdit={onEdit}
            onDelete={onDelete}
            more={ACTION_LABELS.moreLearningEntry}
            edit={ACTION_LABELS.editLearningEntry}
            delete={ACTION_LABELS.deleteLearningEntry}
            deleting={disabled}
          />
        </div>
      </div>

      {entry.categoryLabel || entry.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.categoryLabel ? <MetadataPill label={entry.categoryLabel} /> : null}
          {entry.themes.map((theme) => (
            <MetadataPill key={theme} label={theme} />
          ))}
        </div>
      ) : null}

      {summaryPreview ? (
        <p
          className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted"
          dir="auto"
        >
          {summaryPreview}
        </p>
      ) : null}

      {notesPreview ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-light" dir="auto">
          {notesPreview}
        </p>
      ) : null}

      {sourceLabel ? (
        <p className="mt-3 text-xs text-muted-light" dir="auto">
          {sourceLabel}
        </p>
      ) : null}
    </article>
  );
}
