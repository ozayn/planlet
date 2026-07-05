"use client";

import { PrivateEntryActionsMenu } from "@/components/plans/private-entry-actions-menu";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { SerializedIdea } from "@/lib/ideas/constants";

type IdeaCardProps = {
  idea: SerializedIdea;
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

function shouldShowContentPreview(idea: SerializedIdea): boolean {
  const title = normalizeForCompare(idea.title);
  const content = normalizeForCompare(idea.content);

  if (!content || content === title) {
    return false;
  }

  return !content.startsWith(title);
}

function MetadataPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-soft bg-surface/80 px-2.5 py-1 text-[0.6875rem] text-muted">
      {label}
    </span>
  );
}

export function IdeaCard({
  idea,
  disabled = false,
  onEdit,
  onDelete,
}: IdeaCardProps) {
  const contentPreview = shouldShowContentPreview(idea)
    ? previewText(idea.content)
    : null;

  return (
    <article className="group rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
            {idea.ideaDateLabel}
          </p>
          <h3 className="text-base font-semibold text-foreground" dir="auto">
            {idea.title}
          </h3>
        </div>
        <div className="ui-item-card-actions shrink-0">
          <PrivateEntryActionsMenu
            onEdit={onEdit}
            onDelete={onDelete}
            more={ACTION_LABELS.moreIdea}
            edit={ACTION_LABELS.editIdea}
            delete={ACTION_LABELS.deleteIdea}
            deleting={disabled}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {idea.status !== "NEW" ? <MetadataPill label={idea.statusLabel} /> : null}
        {idea.categoryLabel ? <MetadataPill label={idea.categoryLabel} /> : null}
        {idea.tags.map((tag) => (
          <MetadataPill key={tag} label={tag} />
        ))}
      </div>

      {contentPreview ? (
        <p
          className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted"
          dir="auto"
        >
          {contentPreview}
        </p>
      ) : null}
    </article>
  );
}
