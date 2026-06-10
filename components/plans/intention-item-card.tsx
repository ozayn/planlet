"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type IntentionItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
};

export function IntentionItemCard({ planId, item }: IntentionItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(item.title);
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
                aria-label="Intention"
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
          </div>

          <div className="ui-item-card-actions flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="ui-icon-action-quiet"
              aria-label="Open intention details"
              title="Details"
            >
              <SlidersHorizontalIcon className="h-4 w-4" />
              <span className="ui-tooltip-bubble" role="tooltip">
                Details
              </span>
            </button>
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

function SlidersHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M10 5H3M21 5h-7M10 19H3M21 19h-7M17 12H3M21 12h-7" />
      <circle cx="14" cy="5" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="19" r="2" />
    </svg>
  );
}
