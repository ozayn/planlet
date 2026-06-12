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
import { useMediaQuery } from "@/lib/use-media-query";
import { getTimeHintLabel } from "@/lib/plan-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type IntentionItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
  canEdit?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

export function IntentionItemCard({
  planId,
  item,
  canEdit = true,
  canMoveUp = false,
  canMoveDown = false,
}: IntentionItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const visibleActionsAreShown = useMediaQuery("(min-width: 768px)");
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

  const timeHintLabel = getTimeHintLabel(item.timeHint);
  const hasNote = Boolean(item.comment?.trim());

  const mobileMetaParts: string[] = [];

  if (timeHintLabel) {
    mobileMetaParts.push(timeHintLabel);
  }

  if (item.importance === "HIGH" || item.urgency === "HIGH") {
    mobileMetaParts.push("High priority");
  }

  if (hasNote && canEdit) {
    mobileMetaParts.push("1 note");
  }

  if (item.commentCount > 0) {
    mobileMetaParts.push(
      `${item.commentCount} comment${item.commentCount === 1 ? "" : "s"}`,
    );
  }

  const mobileSubmetaLine = mobileMetaParts.join(" · ");

  return (
    <>
      <article className="group relative overflow-visible rounded-lg border border-dashed border-border-soft bg-accent-cream/25 px-3 py-2.5 sm:px-4 sm:py-2.5">
        <div className="ui-plan-item-stack flex flex-col gap-0 md:gap-0.5">
          <div className="ui-plan-item-row flex items-start gap-1.5 ps-0.5 sm:items-center sm:gap-2.5 sm:ps-1.5">
            <span
              className="ui-plan-item-leading-icon text-base text-muted"
              aria-hidden="true"
            >
              ✨
            </span>

            <div className="ui-plan-item-content min-w-0 flex-1">
              <InlineItemTitle
                id={`intention-title-${item.id}`}
                name={`intentionTitle-${item.id}`}
                value={title}
                displayValue={item.title}
                editing={editingTitle}
                canEdit={canEdit}
                pending={isPending}
                ariaLabel="Intention"
                onStartEdit={() => setEditingTitle(true)}
                onChange={setTitle}
                onSave={saveTitle}
                onCancel={() => {
                  setTitle(item.title);
                  setEditingTitle(false);
                }}
              />
            </div>

            <div className="ui-item-card-actions ui-plan-item-actions flex shrink-0 items-center gap-0.5">
              {canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    {...passwordManagerSafeControlProps}
                    className="ui-plan-item-desktop-action hidden md:inline-flex ui-icon-action-quiet"
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
                    buttonClassName="ui-plan-item-desktop-action hidden md:inline-flex"
                    open={commentsOpen}
                    onOpenChange={setCommentsOpen}
                  />
                  <ItemActionsMenu
                    planId={planId}
                    itemId={item.id}
                    itemTitle={item.title}
                    itemType={item.type}
                    canEdit={canEdit}
                    visibleActionsAreShown={visibleActionsAreShown}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    commentCount={item.commentCount}
                    onEdit={() => setDetailsOpen(true)}
                    onTaskNote={() => setDetailsOpen(true)}
                    onComments={() => setCommentsOpen(true)}
                  />
                </>
              ) : (
                <ItemCommentsButton
                  itemId={item.id}
                  itemTitle={item.title}
                  commentCount={item.commentCount}
                  open={commentsOpen}
                  onOpenChange={setCommentsOpen}
                />
              )}
            </div>
          </div>

          {mobileSubmetaLine ? (
            <p className="ui-plan-item-submeta ps-12 text-[0.6875rem] leading-tight text-muted-light md:hidden">
              {mobileSubmetaLine}
            </p>
          ) : null}
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
