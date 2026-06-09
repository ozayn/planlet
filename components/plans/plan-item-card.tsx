"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { AddItemForm } from "@/components/plans/add-item-form";
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
};

export function PlanItemCard({
  planId,
  item,
  depth = 0,
  isDragging = false,
  dragHandleRef,
  dragHandleAttributes,
  dragHandleListeners,
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
  const timeHintLabel = getTimeHintLabel(item.timeHint);
  const metaParts = [
    getPlanItemTypeLabel(item.type),
    timeHintLabel,
    subtaskCount > 0
      ? `${subtaskCount} subtask${subtaskCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <article className={isNested ? "ms-3 border-s border-border-soft ps-2.5" : ""}>
      <div
        className={`ui-plan-item group relative overflow-hidden px-3 py-2.5 transition-shadow ${STATUS_STYLES[item.status].card} ${
          isDragging ? "opacity-80 ui-shadow-elevated" : ""
        }`}
      >
        <span
          className={`absolute inset-y-2.5 start-0 w-0.5 rounded-full opacity-50 transition-opacity group-hover:opacity-80 group-focus-within:opacity-90 ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-2 ps-1.5">
          {!isNested && dragHandleAttributes && dragHandleListeners ? (
            <button
              type="button"
              ref={dragHandleRef}
              className="mt-1 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-light transition-colors hover:text-muted active:cursor-grabbing"
              aria-label="Drag to reorder item"
              {...dragHandleAttributes}
              {...dragHandleListeners}
            >
              <DragHandleIcon />
            </button>
          ) : null}

          <StatusButton
            planId={planId}
            itemId={item.id}
            status={item.status}
            compact
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
                className="ui-input ui-input-compact w-full"
                aria-label="Item title"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="block w-full py-0.5 text-start text-sm font-medium leading-snug text-foreground"
                dir="auto"
              >
                {item.title}
              </button>
            )}

            {metaParts.length > 0 ? (
              <p className="mt-0.5 text-[0.6875rem] leading-tight text-muted-light">
                {metaParts.join(" · ")}
              </p>
            ) : null}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="ui-action-link"
              >
                Details
              </button>
              {!isNested ? (
                <button
                  type="button"
                  onClick={() => setShowSubtaskForm((current) => !current)}
                  className="ui-action-link"
                >
                  {showSubtaskForm ? "Cancel subtask" : "Add subtask"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showSubtaskForm ? (
        <div className="mt-2 ms-3">
          <AddItemForm
            planId={planId}
            parentItemId={item.id}
            placeholder="Subtask"
            buttonLabel="Add subtask"
          />
        </div>
      ) : null}

      {item.subtasks.length > 0 ? (
        <div className="mt-2 space-y-2">
          {item.subtasks.map((subtask) => (
            <PlanItemCard
              key={subtask.id}
              planId={planId}
              item={subtask}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}

      <ItemDetailsSheet
        planId={planId}
        item={item}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
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
