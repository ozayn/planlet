"use client";

import type { PlanItemType } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { deletePlanItemAction } from "@/app/(app)/plans/actions";
import {
  AddSubtaskIcon,
  CommentIcon,
  EditItemIcon,
  StickyNoteIcon,
  TrashIcon,
} from "@/components/plans/item-action-icons";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ItemActionsMenuProps = {
  planId: string;
  itemId: string;
  itemType: PlanItemType;
  isSubtask?: boolean;
  canEdit?: boolean;
  visibleActionsAreShown?: boolean;
  onEdit: () => void;
  onAddSubtask?: () => void;
  onTaskNote?: () => void;
  onComments?: () => void;
  commentCount?: number;
};

export function ItemActionsMenu({
  planId,
  itemId,
  itemType,
  isSubtask = false,
  canEdit = true,
  visibleActionsAreShown = false,
  onEdit,
  onAddSubtask,
  onTaskNote,
  onComments,
  commentCount = 0,
}: ItemActionsMenuProps) {
  const router = useRouter();
  const labels = getItemActionLabels(itemType, isSubtask);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function updatePosition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 168;
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - menuWidth),
        width: menuWidth,
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        document.getElementById(menuId)?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen, menuId]);

  function toggleMenu(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    setMenuOpen((current) => !current);
  }

  function runAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

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

  const overflowOnly = visibleActionsAreShown;

  const menuShowsEdit = canEdit && !overflowOnly;
  const menuShowsAddSubtask =
    canEdit && !isSubtask && Boolean(onAddSubtask) && !overflowOnly;
  const menuShowsTaskNote = canEdit && Boolean(onTaskNote) && !overflowOnly;
  const menuShowsComments = Boolean(onComments) && !overflowOnly;
  const menuShowsDelete = canEdit;

  const hasMenuItems =
    menuShowsEdit ||
    menuShowsAddSubtask ||
    menuShowsTaskNote ||
    menuShowsComments ||
    menuShowsDelete;

  const menu =
    menuOpen && mounted && hasMenuItems
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label="Item actions"
            className="ui-shadow-elevated fixed z-[70] max-h-[min(20rem,calc(100dvh-1rem))] overflow-y-auto rounded-xl border border-border-soft bg-surface py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            {menuShowsEdit ? (
              <button
                type="button"
                role="menuitem"
                aria-label={labels.edit}
                {...passwordManagerSafeControlProps}
                onClick={() => runAction(onEdit)}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <EditItemIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Edit</span>
              </button>
            ) : null}
            {menuShowsAddSubtask ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Add subtask"
                {...passwordManagerSafeControlProps}
                onClick={() => runAction(onAddSubtask!)}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <AddSubtaskIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Subtask</span>
              </button>
            ) : null}
            {menuShowsTaskNote ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Task note"
                {...passwordManagerSafeControlProps}
                onClick={() => runAction(onTaskNote!)}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <StickyNoteIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Note</span>
              </button>
            ) : null}
            {menuShowsComments ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Comments"
                {...passwordManagerSafeControlProps}
                onClick={() => onComments && runAction(onComments)}
                className="flex min-h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <span className="flex items-center gap-2.5">
                  <CommentIcon className="h-4 w-4 shrink-0 text-muted" />
                  <span>Comments</span>
                </span>
                {commentCount > 0 ? (
                  <span className="text-xs text-muted">{commentCount}</span>
                ) : null}
              </button>
            ) : null}
            {menuShowsDelete ? (
              <button
                type="button"
                role="menuitem"
                aria-label={labels.delete}
                {...passwordManagerSafeControlProps}
                onClick={openConfirm}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-accent-red transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                <span>Delete</span>
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  if (!hasMenuItems) {
    return null;
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          {...passwordManagerSafeControlProps}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuOpen ? menuId : undefined}
          aria-label="More item actions"
          title="More"
          onClick={toggleMenu}
          onPointerDown={(event) => event.stopPropagation()}
          className="ui-icon-action-quiet"
        >
          <MoreIcon className="h-4 w-4" />
          <span className="ui-tooltip-bubble" role="tooltip">
            More
          </span>
        </button>
      </div>

      {menu}

      {menuShowsDelete ? (
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
      ) : null}
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
