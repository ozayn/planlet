"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "@/components/ui/action-icons";
import type { ActionLabel } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type PrivateEntryActionsMenuProps = {
  onEdit: () => void;
  onDelete: () => void;
  more: ActionLabel;
  edit: ActionLabel;
  delete: ActionLabel;
  deleting?: boolean;
};

export function PrivateEntryActionsMenu({
  onEdit,
  onDelete,
  more,
  edit,
  delete: deleteLabel,
  deleting = false,
}: PrivateEntryActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

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

  function handleEdit() {
    setMenuOpen(false);
    onEdit();
  }

  function handleDelete() {
    setMenuOpen(false);
    onDelete();
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        {...passwordManagerSafeControlProps}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={more.ariaLabel}
        title={more.title}
        onClick={() => setMenuOpen((current) => !current)}
        className="ui-icon-action-quiet"
      >
        <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
        <span className="ui-tooltip-bubble" role="tooltip">
          {more.title}
        </span>
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={more.ariaLabel}
          className="absolute end-0 z-50 mt-1 min-w-36 overflow-y-auto rounded-xl border border-border-soft bg-surface py-1 ui-shadow-elevated"
        >
          <button
            type="button"
            role="menuitem"
            aria-label={edit.ariaLabel}
            {...passwordManagerSafeControlProps}
            onClick={handleEdit}
            className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
          >
            <PencilIcon className="h-4 w-4 shrink-0 text-muted" />
            <span>{edit.title}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            aria-label={deleteLabel.ariaLabel}
            disabled={deleting}
            {...passwordManagerSafeControlProps}
            onClick={handleDelete}
            className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-accent-red transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none disabled:opacity-50"
          >
            <Trash2Icon className="h-4 w-4 shrink-0" />
            <span>{deleteLabel.title}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
