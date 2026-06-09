"use client";

import type { PlanItemStatus, PlanItemType } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  deletePlanItemAction,
  updatePlanItemAction,
} from "@/app/(app)/plans/actions";
import { AddItemForm } from "@/components/plans/add-item-form";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
import { StatusButton } from "@/components/plans/status-button";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { getStatusIcon, STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

const ITEM_TYPES: PlanItemType[] = [
  "TASK",
  "EVENT",
  "INTENTION",
  "NOTE",
  "WORK_BLOCK",
  "ERRAND",
  "SOCIAL",
  "REST",
];

type PlanItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
  depth?: number;
};

export function PlanItemCard({ planId, item, depth = 0 }: PlanItemCardProps) {
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

  function handleDelete() {
    if (!window.confirm("Delete this item?")) return;

    startTransition(async () => {
      await deletePlanItemAction(planId, item.id);
      router.refresh();
    });
  }

  const subtaskCount = item.subtasks.length;
  const isNested = depth > 0;

  return (
    <article className={isNested ? "ms-4 border-s border-border-soft ps-3" : ""}>
      <div
        className={`ui-card relative overflow-hidden p-4 ${STATUS_STYLES[item.status].card}`}
      >
        <span
          className={`absolute inset-y-4 start-0 w-1 rounded-full ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-3 ps-2">
          <span
            className={`mt-2 text-base leading-none ${STATUS_STYLES[item.status].icon}`}
            aria-hidden="true"
            title={item.status}
          >
            {getStatusIcon(item.status)}
          </span>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-2">
              {editingTitle ? (
                <input
                  type="text"
                  value={title}
                  dir="auto"
                  autoFocus
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveTitle();
                    if (event.key === "Escape") {
                      setTitle(item.title);
                      setEditingTitle(false);
                    }
                  }}
                  className="ui-input min-h-11"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="block w-full min-h-11 text-start text-sm font-medium text-foreground"
                  dir="auto"
                >
                  {item.title}
                </button>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <StatusButton
                  planId={planId}
                  itemId={item.id}
                  status={item.status}
                />
                <select
                  value={item.type}
                  aria-label="Item type"
                  disabled={isPending}
                  onChange={(event) => {
                    startTransition(async () => {
                      await updatePlanItemAction({
                        planId,
                        itemId: item.id,
                        type: event.target.value as PlanItemType,
                      });
                      router.refresh();
                    });
                  }}
                  className="min-h-10 rounded-lg border border-border bg-surface px-2 text-xs text-muted focus:outline-none focus:ring-2 focus:ring-foreground/10"
                >
                  {ITEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getPlanItemTypeLabel(type)}
                    </option>
                  ))}
                </select>
                {subtaskCount > 0 ? (
                  <span className="text-xs text-muted-light">
                    {subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </div>

            {item.comment ? (
              <p
                className="line-clamp-2 text-sm leading-relaxed text-muted"
                dir="auto"
              >
                {item.comment}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="ui-btn-secondary min-h-10 px-3 text-xs"
              >
                Details
              </button>
              {!isNested ? (
                <button
                  type="button"
                  onClick={() => setShowSubtaskForm((current) => !current)}
                  className="ui-btn-secondary min-h-10 px-3 text-xs"
                >
                  {showSubtaskForm ? "Cancel" : "Add subtask"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="ui-btn-ghost min-h-10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSubtaskForm ? (
        <div className="mt-3 ms-4">
          <AddItemForm
            planId={planId}
            parentItemId={item.id}
            placeholder="Subtask"
            buttonLabel="Add subtask"
          />
        </div>
      ) : null}

      {item.subtasks.length > 0 ? (
        <div className="mt-3 space-y-3">
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
