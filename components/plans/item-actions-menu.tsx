"use client";

import type { PlanItemType } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { deletePlanItemAction } from "@/app/(app)/plans/actions";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ItemActionsMenuProps = {
  planId: string;
  itemId: string;
  itemType: PlanItemType;
  isSubtask?: boolean;
  onEdit: () => void;
};

export function ItemActionsMenu({
  planId,
  itemId,
  itemType,
  isSubtask = false,
  onEdit,
}: ItemActionsMenuProps) {
  const router = useRouter();
  const labels = getItemActionLabels(itemType, isSubtask);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function openConfirm() {
    setMenuOpen(false);
    setError(null);
    setConfirmOpen(true);
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        await deletePlanItemAction(planId, itemId);
        setConfirmOpen(false);
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete item.",
        );
      }
    });
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label={labels.more}
          title="More"
          onClick={() => setMenuOpen((current) => !current)}
          className="ui-icon-action-quiet"
        >
          <MoreIcon className="h-4 w-4" />
          <span className="ui-tooltip-bubble" role="tooltip">
            More
          </span>
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            className="absolute end-0 z-50 mt-1 min-w-36 rounded-xl border border-border-soft bg-surface py-1 ui-shadow-elevated"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="flex min-h-10 w-full items-center px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream"
            >
              {labels.edit}
            </button>
            <button
              type="button"
              role="menuitem"
              aria-label={labels.delete}
              onClick={openConfirm}
              className="flex min-h-10 w-full items-center px-3 text-left text-sm text-accent-red transition-colors hover:bg-accent-cream"
            >
              {labels.delete}
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={labels.deleteTitle}
        confirmLabel={labels.deleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!isDeleting) {
            setConfirmOpen(false);
            setError(null);
          }
        }}
        isConfirming={isDeleting}
        confirmDanger
      >
        <p>{labels.deleteBody}</p>
        {error ? <p className="mt-3 text-sm text-accent-red">{error}</p> : null}
      </ConfirmDialog>
    </>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}
