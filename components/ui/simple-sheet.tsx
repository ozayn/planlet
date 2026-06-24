"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div className="ui-simple-sheet-overlay">
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
        className="ui-simple-sheet-panel"
      >
        <div className="ui-simple-sheet-header flex items-center justify-between px-5 py-3.5">
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
            {...passwordManagerSafeControlProps}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="ui-simple-sheet-body px-5 py-4">{children}</div>
        {footer ? (
          <div className="ui-simple-sheet-footer px-5 pt-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
