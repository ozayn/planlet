"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";

import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { PreparedMermaidSvg } from "@/lib/life-lab/mermaid-svg";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

type MermaidExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  code: string;
  preparedSvg: PreparedMermaidSvg | null;
  failed: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function MermaidExpandDialog({
  open,
  onClose,
  code,
  preparedSvg,
  failed,
  returnFocusRef,
}: MermaidExpandDialogProps) {
  const titleId = useId();
  const subtitleId = useId();
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setZoom(1);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      returnFocusRef?.current?.focus();
    }

    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

  if (!open || !mounted) {
    return null;
  }

  const showDiagram = preparedSvg && !failed;

  return createPortal(
    <div className="ui-mermaid-dialog-overlay">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="ui-mermaid-dialog-panel"
      >
        <div className="ui-mermaid-dialog-header">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-base font-semibold text-foreground"
              dir="auto"
            >
              Learning Map Diagram
            </h2>
            <p
              id={subtitleId}
              className="mt-0.5 text-sm text-muted"
            >
              Use scroll to explore the full diagram.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showDiagram ? (
              <div
                className="ui-mermaid-dialog-zoom hidden sm:flex"
                role="group"
                aria-label="Diagram zoom"
              >
                <button
                  type="button"
                  className="ui-mermaid-dialog-zoom-btn"
                  aria-label="Fit diagram"
                  title="Fit"
                  onClick={() => setZoom(1)}
                >
                  Fit
                </button>
                <button
                  type="button"
                  className="ui-mermaid-dialog-zoom-btn"
                  aria-label="100% zoom"
                  title="100%"
                  onClick={() => setZoom(1)}
                >
                  100%
                </button>
                <button
                  type="button"
                  className="ui-mermaid-dialog-zoom-btn"
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
                  disabled={zoom <= MIN_ZOOM}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="ui-mermaid-dialog-zoom-btn"
                  aria-label="Zoom in"
                  title="Zoom in"
                  onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
                  disabled={zoom >= MAX_ZOOM}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              {...passwordManagerSafeControlProps}
              className="ui-mermaid-dialog-close"
              aria-label="Close"
              title="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="ui-mermaid-dialog-body">
          {showDiagram ? (
            <div
              className="ui-mermaid-dialog-canvas"
              style={{ zoom }}
            >
              <div
                className="ui-mermaid-svg"
                dangerouslySetInnerHTML={{ __html: preparedSvg.html }}
              />
            </div>
          ) : (
            <pre className="ui-mermaid-fallback">
              <code>{code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
