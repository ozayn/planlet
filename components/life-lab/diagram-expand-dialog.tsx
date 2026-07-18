"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";

import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

type DiagramExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  svgHtml: string | null;
  returnFocusRef?: RefObject<HTMLElement | null>;
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  errorMessage?: string | null;
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function DiagramExpandDialog({
  open,
  onClose,
  svgHtml,
  returnFocusRef,
  title = "Diagram",
  subtitle = "Drag to pan. Use the controls to zoom or fit.",
  toolbar,
  errorMessage,
}: DiagramExpandDialogProps) {
  const titleId = useId();
  const subtitleId = useId();
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const zoomRef = useRef(1);
  const panRef = useRef({
    pointerId: 0,
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    const svg = canvasRef.current?.querySelector("svg");

    if (!viewport || !svg) {
      setZoom(1);
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const viewBox = (svg as SVGSVGElement).viewBox?.baseVal;
    const naturalWidth =
      viewBox?.width || bounds.width / zoomRef.current;
    const naturalHeight =
      viewBox?.height || bounds.height / zoomRef.current;
    const availableWidth = Math.max(1, viewport.clientWidth - 48);
    const availableHeight = Math.max(1, viewport.clientHeight - 48);
    const fitted = clampZoom(
      Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight),
    );

    setZoom(fitted);
    requestAnimationFrame(() => {
      viewport.scrollTo({ left: 0, top: 0 });
    });
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setPanning(false);
      requestAnimationFrame(fitToScreen);
    }
  }, [fitToScreen, open, svgHtml]);

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
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (!first || !last) {
        return;
      }

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

  function startPan(event: ReactPointerEvent<HTMLDivElement>): void {
    const viewport = viewportRef.current;

    if (!viewport || event.button !== 0) {
      return;
    }

    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>): void {
    const viewport = viewportRef.current;

    if (!viewport || !panning || panRef.current.pointerId !== event.pointerId) {
      return;
    }

    viewport.scrollLeft =
      panRef.current.scrollLeft - (event.clientX - panRef.current.x);
    viewport.scrollTop =
      panRef.current.scrollTop - (event.clientY - panRef.current.y);
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (panRef.current.pointerId === event.pointerId) {
      setPanning(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }

  if (!open || !mounted) {
    return null;
  }

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
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p id={subtitleId} className="mt-0.5 text-sm text-muted">
              {subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {toolbar}
            <div
              className="ui-mermaid-dialog-zoom"
              role="group"
              aria-label="Diagram zoom"
            >
              <button
                type="button"
                className="ui-mermaid-dialog-zoom-btn"
                aria-label="Fit diagram"
                onClick={fitToScreen}
              >
                Fit
              </button>
              <button
                type="button"
                className="ui-mermaid-dialog-zoom-btn"
                aria-label="Zoom out"
                onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ui-mermaid-dialog-zoom-btn"
                aria-label="Zoom in"
                onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              {...passwordManagerSafeControlProps}
              className="ui-mermaid-dialog-close"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref={viewportRef}
          className={`ui-mermaid-dialog-body ui-diagram-pan-surface${panning ? " is-panning" : ""}`}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div
            ref={canvasRef}
            className="ui-mermaid-dialog-canvas"
            style={{ zoom }}
          >
            {svgHtml ? (
              <div
                className="ui-mermaid-svg"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : errorMessage ? (
              <p className="ui-mermaid-loading">{errorMessage}</p>
            ) : (
              <p className="ui-mermaid-loading">Rendering diagram…</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
