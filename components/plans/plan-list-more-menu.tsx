"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { deletePlanAction } from "@/app/(app)/plans/actions";
import {
  FileTextIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "@/components/ui/action-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type PlanListMoreMenuProps = {
  planId: string;
  openHref: string;
  summaryHref?: string | null;
  summaryLabel?: string;
};

export function PlanListMoreMenu({
  planId,
  openHref,
  summaryHref,
  summaryLabel = "Summary",
}: PlanListMoreMenuProps) {
  const router = useRouter();
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
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen((current) => !current);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function openConfirm() {
    closeMenu();
    setError(null);
    setConfirmOpen(true);
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deletePlanAction(planId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    });
  }

  const menu =
    menuOpen && mounted
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label={ACTION_LABELS.planActions.ariaLabel}
            className="ui-shadow-elevated fixed z-[70] max-h-[min(20rem,calc(100dvh-1rem))] overflow-y-auto rounded-xl border border-border-soft bg-surface py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <Link
              href={openHref}
              role="menuitem"
              onClick={closeMenu}
              className="flex min-h-10 w-full items-center px-3 text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
            >
              Open
            </Link>
            {summaryHref ? (
              <Link
                href={summaryHref}
                role="menuitem"
                onClick={closeMenu}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <FileTextIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>{summaryLabel}</span>
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              aria-label={ACTION_LABELS.deletePlan.ariaLabel}
              {...passwordManagerSafeControlProps}
              onClick={openConfirm}
              className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-accent-red transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
            >
              <Trash2Icon className="h-4 w-4 shrink-0" />
              <span>{ACTION_LABELS.deletePlan.title}</span>
            </button>
          </div>,
          document.body,
        )
      : null;

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
          aria-label={ACTION_LABELS.morePlan.ariaLabel}
          title={ACTION_LABELS.morePlan.title}
          onClick={toggleMenu}
          onPointerDown={(event) => event.stopPropagation()}
          className="ui-icon-action-quiet"
        >
          <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
          <span className="ui-tooltip-bubble" role="tooltip">
            {ACTION_LABELS.morePlan.title}
          </span>
        </button>
      </div>

      {menu}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this plan?"
        confirmLabel={ACTION_LABELS.deletePlan.title}
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
        <p>
          This will permanently delete the plan, its items, shares, kudos, and
          exports. This cannot be undone.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-accent-red">{error}</p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
