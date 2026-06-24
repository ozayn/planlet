"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { deletePlanAction } from "@/app/(app)/plans/actions";
import { MoreHorizontalIcon, Trash2Icon } from "@/components/ui/action-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type DeletePlanMenuProps = {
  planId: string;
  redirectTo?: string;
};

export function DeletePlanMenu({ planId, redirectTo }: DeletePlanMenuProps) {
  const router = useRouter();
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

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          {...passwordManagerSafeControlProps}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label={ACTION_LABELS.morePlan.ariaLabel}
          title={ACTION_LABELS.morePlan.title}
          onClick={() => setMenuOpen((current) => !current)}
          className="ui-icon-action-quiet"
        >
          <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
          <span className="ui-tooltip-bubble" role="tooltip">
            {ACTION_LABELS.morePlan.title}
          </span>
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label={ACTION_LABELS.planActions.ariaLabel}
            className="ui-floating-menu-panel absolute end-0 z-50 mt-1 min-w-40 rounded-xl border border-border-soft bg-surface py-1 ui-shadow-elevated"
          >
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
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this plan?"
        confirmLabel={ACTION_LABELS.deletePlan.title}
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
    </>
  );
}
