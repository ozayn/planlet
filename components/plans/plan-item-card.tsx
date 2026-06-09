"use client";

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
    <article className={isNested ? "ms-4 border-s border-border-soft ps-3" : ""}>
      <div
        className={`ui-card relative overflow-hidden p-4 ${STATUS_STYLES[item.status].card}`}
      >
        <span
          className={`absolute inset-y-4 start-0 w-1 rounded-full ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-3 ps-2">
          <StatusButton
            planId={planId}
            itemId={item.id}
            status={item.status}
            compact
          />

          <div className="min-w-0 flex-1 space-y-2">
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
                className="ui-input min-h-11"
                aria-label="Item title"
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

            {metaParts.length > 0 ? (
              <p className="text-xs text-muted-light">{metaParts.join(" · ")}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="ui-text-link"
              >
                Details
              </button>
              {!isNested ? (
                <button
                  type="button"
                  onClick={() => setShowSubtaskForm((current) => !current)}
                  className="ui-text-link"
                >
                  {showSubtaskForm ? "Cancel subtask" : "Add subtask"}
                </button>
              ) : null}
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
