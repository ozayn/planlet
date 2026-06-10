"use client";

import type { PlanItemType } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  deletePlanItemAction,
  movePlanItemAction,
} from "@/app/(app)/plans/actions";
import {
  AddSubtaskIcon,
  CommentIcon,
  EditItemIcon,
  MoveDownIcon,
  MoveUpIcon,
  StickyNoteIcon,
  TrashIcon,
} from "@/components/plans/item-action-icons";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { MoreHorizontalIcon } from "@/components/ui/action-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ItemActionsMenuProps = {
  planId: string;
  itemId: string;
  itemType: PlanItemType;
  isSubtask?: boolean;
  canEdit?: boolean;
  visibleActionsAreShown?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
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
  canMoveUp = false,
  canMoveDown = false,
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
  const [isMoving, startMove] = useTransition();
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

  function handleMove(direction: "up" | "down") {
    setMenuOpen(false);
    setError(null);

    startMove(async () => {
      const result = await movePlanItemAction(planId, itemId, direction);

      if (!result.success) {
        setError(result.error ?? "Failed to move item.");
        return;
      }

      router.refresh();
    });
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
  const mobileFullMenu = canEdit && !overflowOnly;

  const menuShowsEdit = mobileFullMenu;
  const menuShowsMoveUp = mobileFullMenu;
  const menuShowsMoveDown = mobileFullMenu;
  const menuShowsAddSubtask =
    mobileFullMenu &&
    !isSubtask &&
    itemType === "TASK" &&
    Boolean(onAddSubtask);
  const menuShowsTaskNote =
    mobileFullMenu && itemType !== "NOTE" && Boolean(onTaskNote);
  const menuShowsComments = Boolean(onComments) && !overflowOnly;
  const menuShowsDelete = canEdit;

  const hasMenuItems =
    menuShowsEdit ||
    menuShowsMoveUp ||
    menuShowsMoveDown ||
    menuShowsAddSubtask ||
    menuShowsTaskNote ||
    menuShowsComments ||
    menuShowsDelete;

  const hasItemsAboveDelete =
    menuShowsEdit ||
    menuShowsMoveUp ||
    menuShowsMoveDown ||
    menuShowsAddSubtask ||
    menuShowsTaskNote ||
    menuShowsComments;

  const menuItemClassName =
    "flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none";
  const menuItemDisabledClassName =
    "flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  const menu =
    menuOpen && mounted && hasMenuItems
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label={ACTION_LABELS.itemActions.ariaLabel}
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
                className={menuItemClassName}
              >
                <EditItemIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Edit</span>
              </button>
            ) : null}
            {menuShowsMoveUp ? (
              <button
                type="button"
                role="menuitem"
                aria-label={ACTION_LABELS.moveItemUp.ariaLabel}
                title={ACTION_LABELS.moveItemUp.title}
                disabled={!canMoveUp || isMoving}
                {...passwordManagerSafeControlProps}
                onClick={() => handleMove("up")}
                className={canMoveUp ? menuItemClassName : menuItemDisabledClassName}
              >
                <MoveUpIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Move up</span>
              </button>
            ) : null}
            {menuShowsMoveDown ? (
              <button
                type="button"
                role="menuitem"
                aria-label={ACTION_LABELS.moveItemDown.ariaLabel}
                title={ACTION_LABELS.moveItemDown.title}
                disabled={!canMoveDown || isMoving}
                {...passwordManagerSafeControlProps}
                onClick={() => handleMove("down")}
                className={
                  canMoveDown ? menuItemClassName : menuItemDisabledClassName
                }
              >
                <MoveDownIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Move down</span>
              </button>
            ) : null}
            {menuShowsAddSubtask ? (
              <button
                type="button"
                role="menuitem"
                aria-label={ACTION_LABELS.addSubtask.ariaLabel}
                {...passwordManagerSafeControlProps}
                onClick={() => runAction(onAddSubtask!)}
                className={menuItemClassName}
              >
                <AddSubtaskIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Subtask</span>
              </button>
            ) : null}
            {menuShowsTaskNote ? (
              <button
                type="button"
                role="menuitem"
                aria-label={ACTION_LABELS.taskNote.ariaLabel}
                {...passwordManagerSafeControlProps}
                onClick={() => runAction(onTaskNote!)}
                className={menuItemClassName}
              >
                <StickyNoteIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>Note</span>
              </button>
            ) : null}
            {menuShowsComments ? (
              <button
                type="button"
                role="menuitem"
                aria-label={ACTION_LABELS.comments.ariaLabel}
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
              hasItemsAboveDelete ? (
                <div className="mt-1 border-t border-border-soft pt-1">
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
                </div>
              ) : (
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
              )
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
          aria-label={ACTION_LABELS.moreItem.ariaLabel}
          title={ACTION_LABELS.moreItem.title}
          onClick={toggleMenu}
          onPointerDown={(event) => event.stopPropagation()}
          className="ui-icon-action-quiet"
        >
          <MoreHorizontalIcon className="h-4 w-4" />
          <span className="ui-tooltip-bubble" role="tooltip">
            {ACTION_LABELS.moreItem.title}
          </span>
        </button>
      </div>

      {menu}

      {error && !confirmOpen ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}

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
