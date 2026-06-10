"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { deletePlanAction } from "@/app/(app)/plans/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label="Plan actions"
          onClick={() => setMenuOpen((current) => !current)}
          className="ui-btn-ghost min-h-9 min-w-9 rounded-lg px-2 text-muted-light"
        >
          ⋯
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            className="absolute end-0 z-50 mt-1 min-w-40 rounded-xl border border-border-soft bg-surface py-1 ui-shadow-elevated"
          >
            <button
              type="button"
              role="menuitem"
              aria-label="Delete plan"
              onClick={openConfirm}
              className="flex min-h-10 w-full items-center px-3 text-left text-sm text-accent-red transition-colors hover:bg-accent-cream"
            >
              Delete plan
            </button>
          </div>
        ) : null}
      </div>

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
    </>
  );
}
