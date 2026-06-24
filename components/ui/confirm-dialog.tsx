"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  confirmDanger?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isConfirming = false,
  confirmDanger = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirming) {
        onCancel();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onCancel, isConfirming]);

  if (!open) return null;

  return (
    <div className="ui-dialog-overlay">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={isConfirming ? undefined : onCancel}
        disabled={isConfirming}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="ui-dialog-panel"
      >
        <div className="ui-dialog-body space-y-2">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <div
            id={descriptionId}
            className="text-sm leading-relaxed text-muted"
          >
            {children}
          </div>
        </div>
        <div className="ui-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="ui-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={
              confirmDanger
                ? "ui-btn-primary bg-accent-red hover:opacity-90"
                : "ui-btn-primary"
            }
          >
            {isConfirming ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
