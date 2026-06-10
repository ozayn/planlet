"use client";

import { useEffect, type ReactNode } from "react";

type SimpleSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function SimpleSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: SimpleSheetProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative z-10 flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-0.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface ui-shadow-sheet md:max-h-[min(85dvh,90vh)] md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-5 py-3.5">
          <h2
            id="sheet-title"
            className="text-base font-semibold text-foreground"
            dir="auto"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border-soft bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
