"use client";

import { useEffect, type ReactNode } from "react";

type SimpleSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function SimpleSheet({ open, onClose, title, children }: SimpleSheetProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/20"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-[0_-8px_32px_rgb(20_18_16/0.12)] md:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
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
            className="min-h-10 min-w-10 rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            aria-label="Close details"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
