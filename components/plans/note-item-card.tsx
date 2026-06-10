"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { EditItemIcon } from "@/components/plans/item-action-icons";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { ItemCommentsButton } from "@/components/plans/item-comments-button";
import { ItemActionsMenu } from "@/components/plans/item-actions-menu";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type NoteItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
};

export function NoteItemCard({ planId, item }: NoteItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const actionLabels = getItemActionLabels(item.type);

  useEffect(() => {
    if (!editing) {
      setTitle(item.title);
    }
  }, [item.title, editing]);

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title);
      setEditing(false);
      return;
    }

    startTransition(async () => {
      await updatePlanItemAction({
        planId,
        itemId: item.id,
        title: trimmed,
      });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <article className="group rounded-lg border border-border-soft/80 bg-surface-muted/40 px-3 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 shrink-0 text-xs text-muted-light"
            aria-hidden="true"
          >
            •
          </span>

          <div className="min-w-0 flex-1">
            {editing ? (
              <textarea
                id={`note-body-${item.id}`}
                name={`noteBody-${item.id}`}
                value={title}
                dir="auto"
                autoFocus
                rows={3}
                disabled={isPending}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setTitle(item.title);
                    setEditing(false);
                  }
                }}
                className="ui-textarea min-h-16 w-full py-1.5 text-sm"
                aria-label="Note"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                {...passwordManagerSafeControlProps}
                className="block w-full whitespace-pre-wrap text-start text-sm leading-relaxed text-foreground"
                dir="auto"
              >
                {item.title}
              </button>
            )}
          </div>

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
              onEdit={() => setDetailsOpen(true)}
            />
          </div>
        </div>
      </article>

      <ItemDetailsSheet
        planId={planId}
        item={item}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </>
  );
}

