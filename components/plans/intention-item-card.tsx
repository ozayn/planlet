"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { EditItemIcon } from "@/components/plans/item-action-icons";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { InlineItemTitle } from "@/components/plans/inline-item-title";
import { ItemCommentsButton } from "@/components/plans/item-comments-button";
import { ItemActionsMenu } from "@/components/plans/item-actions-menu";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type IntentionItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
  canEdit?: boolean;
};

export function IntentionItemCard({
  planId,
  item,
  canEdit = true,
}: IntentionItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const actionLabels = getItemActionLabels(item.type);

  useEffect(() => {
    if (!editingTitle) {
      setTitle(item.title);
    }
  }, [item.title, editingTitle]);

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title);
      setEditingTitle(false);
      return;
    }

    startTransition(async () => {
      await updatePlanItemAction({
        planId,
        itemId: item.id,
        title: trimmed,
      });
      setEditingTitle(false);
      router.refresh();
    });
  }

  return (
    <>
      <article className="group rounded-lg border border-dashed border-border-soft bg-accent-cream/25 px-3 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span
            className="flex h-8 w-6 shrink-0 items-center justify-center text-sm text-muted"
            aria-hidden="true"
          >
            ✨
          </span>

          <div className="min-w-0 flex-1">
            <InlineItemTitle
              id={`intention-title-${item.id}`}
              name={`intentionTitle-${item.id}`}
              value={title}
              displayValue={item.title}
              editing={editingTitle}
              canEdit={canEdit}
              pending={isPending}
              ariaLabel="Intention"
              displayClassName="block w-full truncate text-start text-sm font-medium leading-tight text-foreground"
              onStartEdit={() => setEditingTitle(true)}
              onChange={setTitle}
              onSave={saveTitle}
              onCancel={() => {
                setTitle(item.title);
                setEditingTitle(false);
              }}
            />
          </div>

          {canEdit ? (
            <div className="ui-item-card-actions flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                {...passwordManagerSafeControlProps}
                className="ui-icon-action-quiet"
                aria-label={actionLabels.edit}
                title={actionLabels.edit}
              >
                <EditItemIcon className="h-4 w-4" />
                <span className="ui-tooltip-bubble" role="tooltip">
                  {actionLabels.edit}
                </span>
              </button>
              <ItemCommentsButton
                itemId={item.id}
                itemTitle={item.title}
                commentCount={item.commentCount}
              />
              <ItemActionsMenu
                planId={planId}
                itemId={item.id}
                itemType={item.type}
                visibleActionsAreShown
                onEdit={() => setDetailsOpen(true)}
              />
            </div>
          ) : (
            <div className="ui-item-card-actions flex shrink-0 items-center gap-0.5">
              <ItemCommentsButton
                itemId={item.id}
                itemTitle={item.title}
                commentCount={item.commentCount}
              />
            </div>
          )}
        </div>
      </article>

      {canEdit ? (
        <ItemDetailsSheet
          planId={planId}
          item={item}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
    </>
  );
}
