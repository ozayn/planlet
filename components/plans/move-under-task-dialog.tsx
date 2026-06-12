"use client";

import { useEffect, useId, useRef } from "react";

import { ActionErrorBanner } from "@/components/ui/action-error-banner";

type MoveUnderTaskCandidate = {
  id: string;
  title: string;
};

type MoveUnderTaskDialogProps = {
  open: boolean;
  itemTitle: string;
  candidates: MoveUnderTaskCandidate[];
  onSelect: (parentItemId: string) => void;
  onClose: () => void;
  isPending?: boolean;
  error?: string | null;
};

export function MoveUnderTaskDialog({
  open,
  itemTitle,
  candidates,
  onSelect,
  onClose,
  isPending = false,
  error = null,
}: MoveUnderTaskDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose, isPending]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/20"
        onClick={() => {
          if (!isPending) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="ui-shadow-elevated relative z-10 w-full max-w-sm rounded-xl border border-border-soft bg-surface p-4"
      >
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Move under another task
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-muted">
          Choose a parent task for &ldquo;{itemTitle}&rdquo;.
        </p>

        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onSelect(candidate.id)}
                className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {candidate.title}
              </button>
            </li>
          ))}
        </ul>

        {error ? (
          <div className="mt-3">
            <ActionErrorBanner message={error} />
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="ui-btn-secondary ui-btn-compact min-h-10 px-4"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
