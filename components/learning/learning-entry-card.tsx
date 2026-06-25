"use client";

import { PrivateEntryActionsMenu } from "@/components/plans/private-entry-actions-menu";
import {
  formatLearningImportanceLabel,
  type SerializedLearningEntry,
} from "@/lib/learning-journey/constants";
import { ACTION_LABELS } from "@/lib/action-labels";

type LearningEntryCardProps = {
  entry: SerializedLearningEntry;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function previewText(value: string | null, maxLength = 240): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength - 1).trim()}…`
    : trimmed;
}

export function LearningEntryCard({
  entry,
  disabled = false,
  onEdit,
  onDelete,
}: LearningEntryCardProps) {
  const sourceParts = [
    entry.sourceTypeLabel,
    entry.sourceName,
  ].filter(Boolean);
  const summaryPreview = previewText(entry.summary);
  const notesPreview = previewText(entry.notes);
  const metadataParts = [
    entry.categoryLabel,
    ...entry.themes,
  ].filter(Boolean);
  const secondaryParts = [
    sourceParts.length > 0 ? sourceParts.join(" · ") : null,
    formatLearningImportanceLabel(entry.importance),
  ].filter(Boolean);

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

      {metadataParts.length > 0 ? (
        <p className="mt-2 text-xs text-muted">{metadataParts.join(" · ")}</p>
      ) : null}

      {summaryPreview ? (
        <p
          className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
          dir="auto"
        >
          {summaryPreview}
        </p>
      ) : null}

      {notesPreview ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted" dir="auto">
          {notesPreview}
        </p>
      ) : null}

      {secondaryParts.length > 0 ? (
        <p className="mt-3 text-xs text-muted-light">{secondaryParts.join(" · ")}</p>
      ) : null}
    </article>
  );
}
