"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { PlanItemView } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { AddItemForm } from "@/components/plans/add-item-form";
import {
  AddSubtaskIcon,
  EditItemIcon,
} from "@/components/plans/item-action-icons";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { ItemCommentsButton } from "@/components/plans/item-comments-button";
import { ItemActionsMenu } from "@/components/plans/item-actions-menu";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
import { StatusButton } from "@/components/plans/status-button";
import { getPlanItemTypeLabel, getTimeHintLabel } from "@/lib/plan-labels";
import { STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type PlanItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
  depth?: number;
  isDragging?: boolean;
  dragHandleRef?: (element: HTMLElement | null) => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
  itemView?: PlanItemView;
  canEdit?: boolean;
};

export function PlanItemCard({
  planId,
  item,
  depth = 0,
  isDragging = false,
  dragHandleRef,
  dragHandleAttributes,
  dragHandleListeners,
  itemView = "MINIMAL",
  canEdit = true,
}: PlanItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const subtaskCount = item.subtasks.length;
  const isNested = depth > 0;
  const actionLabels = getItemActionLabels(item.type, isNested);
  const timeHintLabel = getTimeHintLabel(item.timeHint);
  const metaParts = [
    getPlanItemTypeLabel(item.type),
    timeHintLabel,
    subtaskCount > 0
      ? `${subtaskCount} subtask${subtaskCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  const showDragHandle =
    !isNested && dragHandleAttributes && dragHandleListeners;

  return (
    <article className={isNested ? "ms-3 border-s border-border-soft ps-2" : ""}>
      <div
        className={`ui-plan-item group relative overflow-visible px-3 py-2 transition-shadow sm:px-4 sm:py-2.5 ${STATUS_STYLES[item.status].card} ${
          isDragging ? "opacity-80 ui-shadow-elevated" : ""
        }`}
      >
        <span
          className={`absolute inset-y-2 start-0 w-0.5 rounded-full opacity-50 transition-opacity group-hover:opacity-80 group-focus-within:opacity-90 ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="flex items-center gap-2 ps-1 sm:gap-2.5 sm:ps-1.5">
          {showDragHandle ? (
            <button
              type="button"
              ref={dragHandleRef}
              className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-light transition-colors hover:text-muted active:cursor-grabbing"
              aria-label="Drag to reorder item"
              {...dragHandleAttributes}
              {...dragHandleListeners}
            >
              <DragHandleIcon />
            </button>
          ) : isNested ? (
            <span className="h-8 w-0 shrink-0" aria-hidden="true" />
          ) : null}

          <StatusButton
            planId={planId}
            itemId={item.id}
            status={item.status}
            compact
            itemView={itemView}
          />

          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <input
                type="text"
                value={title}
                dir="auto"
                autoFocus
                disabled={isPending}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveTitle();
                  if (event.key === "Escape") {
                    setTitle(item.title);
                    setEditingTitle(false);
                  }
                }}
                className="ui-input ui-input-compact min-h-8 w-full py-1"
                aria-label="Item title"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="block w-full truncate text-start text-sm font-medium leading-tight text-foreground"
                dir="auto"
              >
                {item.title}
              </button>
            )}

            {metaParts.length > 0 ? (
              <p className="mt-0.5 truncate text-[0.6875rem] leading-tight text-muted-light">
                {metaParts.join(" · ")}
              </p>
            ) : null}
          </div>

          <div className="ui-item-card-actions flex shrink-0 items-center gap-0.5">
            {canEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="ui-icon-action-quiet"
                  aria-label={actionLabels.edit}
                  title={actionLabels.edit}
                >
                  <EditItemIcon className="h-4 w-4" />
                  <span className="ui-tooltip-bubble" role="tooltip">
                    {actionLabels.edit}
                  </span>
                </button>
                {!isNested ? (
                  <button
                    type="button"
                    onClick={() => setShowSubtaskForm((current) => !current)}
                    className={`ui-icon-action-quiet${
                      showSubtaskForm ? " ui-icon-action-quiet-active" : ""
                    }`}
                    aria-label={
                      showSubtaskForm ? "Cancel subtask" : "Add subtask"
                    }
                    title={showSubtaskForm ? "Cancel subtask" : "Add subtask"}
                  >
                    <AddSubtaskIcon className="h-4 w-4" />
                    <span className="ui-tooltip-bubble" role="tooltip">
                      {showSubtaskForm ? "Cancel subtask" : "Add subtask"}
                    </span>
                  </button>
                ) : null}
              </>
            ) : null}
            <ItemCommentsButton
              itemId={item.id}
              itemTitle={item.title}
              commentCount={item.commentCount}
            />
            {canEdit ? (
              <ItemActionsMenu
                planId={planId}
                itemId={item.id}
                itemType={item.type}
                isSubtask={isNested}
                onEdit={() => setDetailsOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </div>

      {showSubtaskForm ? (
        <div className="mt-1.5 ms-7 border-s border-border-soft/70 ps-2.5 sm:ms-9 sm:ps-3">
          <AddItemForm
            planId={planId}
            parentItemId={item.id}
            placeholder="Subtask"
            buttonLabel="Add subtask"
            compact
          />
        </div>
      ) : null}

      {item.subtasks.length > 0 ? (
        <div className="mt-1.5 space-y-1.5">
          {item.subtasks.map((subtask) => (
            <PlanItemCard
              key={subtask.id}
              planId={planId}
              item={subtask}
              depth={depth + 1}
              itemView={itemView}
            />
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <ItemDetailsSheet
          planId={planId}
          item={item}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          isSubtask={isNested}
        />
      ) : null}
    </article>
  );
}

function DragHandleIcon() {
  return (
    <svg
      className="h-4 w-3"
      viewBox="0 0 12 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="4" cy="3" r="1.25" />
      <circle cx="8" cy="3" r="1.25" />
      <circle cx="4" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="4" cy="13" r="1.25" />
      <circle cx="8" cy="13" r="1.25" />
    </svg>
  );
}

