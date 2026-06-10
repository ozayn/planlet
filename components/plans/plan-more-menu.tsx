"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { deletePlanAction } from "@/app/(app)/plans/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type PlanMoreMenuProps = {
  planId: string;
  redirectTo?: string;
  showDelete?: boolean;
  periodSummaryHref?: string;
  periodSummaryLabel?: string;
};

export function PlanMoreMenu({
  planId,
  redirectTo,
  showDelete = true,
  periodSummaryHref,
  periodSummaryLabel,
}: PlanMoreMenuProps) {
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
      const menuWidth = 176;
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

  function openConfirm() {
    setMenuOpen(false);
    setError(null);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    startDelete(async () => {
      const result = await deletePlanAction(planId, { redirectTo });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setConfirmOpen(false);

      if (!redirectTo) {
        router.refresh();
      }
    });
  }

  const menu =
    menuOpen && mounted
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label="Plan actions"
            className="ui-shadow-elevated fixed z-[70] max-h-[min(20rem,calc(100dvh-1rem))] overflow-y-auto rounded-xl border border-border-soft bg-surface py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            {periodSummaryHref ? (
              <Link
                href={periodSummaryHref}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <SummaryIcon className="h-4 w-4 shrink-0 text-muted" />
                <span>{periodSummaryLabel ?? "Summary"}</span>
              </Link>
            ) : null}
            {showDelete ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Delete plan"
                {...passwordManagerSafeControlProps}
                onClick={openConfirm}
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-accent-red transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none"
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                <span>Delete plan</span>
              </button>
            ) : null}
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
          aria-label="More plan actions"
          title="More"
          onClick={() => setMenuOpen((current) => !current)}
          className="ui-icon-action"
        >
          <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
          <span className="ui-tooltip-bubble" role="tooltip">
            More
          </span>
        </button>
      </div>

      {menu}

      {showDelete ? (
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this plan?"
        confirmLabel="Delete plan"
        onConfirm={handleConfirm}
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
      ) : null}
    </>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M3 6h18" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      />
      <path strokeLinecap="round" d="M10 11v6" />
      <path strokeLinecap="round" d="M14 11v6" />
    </svg>
  );
}

function SummaryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      />
      <path strokeLinecap="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
