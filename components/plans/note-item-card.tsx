"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
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
                className="block w-full whitespace-pre-wrap text-start text-sm leading-relaxed text-foreground"
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
              aria-label="Open note details"
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
