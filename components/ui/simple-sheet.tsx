"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import { useMediaQuery } from "@/lib/use-media-query";

const SWIPE_DISMISS_THRESHOLD_PX = 72;

type SimpleSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  bodyClassName?: string;
  bodyRef?: RefObject<HTMLDivElement | null>;
  closeLabel?: string;
  backdropLabel?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  enableSwipeDismiss?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
};

export function SimpleSheet({
  open,
  onClose,
  title,
  children,
  footer,
  headerExtra,
  bodyClassName,
  bodyRef,
  closeLabel = "Close",
  backdropLabel = "Close",
  returnFocusRef,
  enableSwipeDismiss = true,
  overlayClassName,
  panelClassName,
}: SimpleSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const dragStartYRef = useRef(0);
  const isMobileSheet = useMediaQuery("(max-width: 767px)");
  const swipeEnabled = enableSwipeDismiss && isMobileSheet;

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
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      returnFocusRef?.current?.focus();
      setDragOffset(0);
      setIsDragging(false);
    }

    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

  function handleDragStart(clientY: number) {
    if (!swipeEnabled) {
      return;
    }

    dragStartYRef.current = clientY;
    setIsDragging(true);
  }

  function handleDragMove(clientY: number) {
    if (!isDragging) {
      return;
    }

    const delta = Math.max(0, clientY - dragStartYRef.current);
    setDragOffset(delta);
  }

  function handleDragEnd() {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);

    if (dragOffset >= SWIPE_DISMISS_THRESHOLD_PX) {
      onClose();
      return;
    }

    setDragOffset(0);
  }

  if (!open || !mounted) return null;

  const panelStyle =
    dragOffset > 0
      ? {
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }
      : undefined;

  return createPortal(
    <div className={`ui-simple-sheet-overlay${overlayClassName ? ` ${overlayClassName}` : ""}`}>
      <button
        type="button"
        aria-label={backdropLabel}
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`ui-simple-sheet-panel${
          swipeEnabled && !isDragging && dragOffset === 0
            ? " ui-simple-sheet-panel-enter"
            : ""
        }${panelClassName ? ` ${panelClassName}` : ""}`}
        style={panelStyle}
      >
        {swipeEnabled ? (
          <div
            className="ui-simple-sheet-drag-zone"
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }

              handleDragStart(event.clientY);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                return;
              }

              handleDragMove(event.clientY);
            }}
            onPointerUp={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                return;
              }

              event.currentTarget.releasePointerCapture(event.pointerId);
              handleDragEnd();
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }

              handleDragEnd();
            }}
          >
            <div className="ui-simple-sheet-drag-handle" aria-hidden="true" />
          </div>
        ) : null}
        <div className="ui-simple-sheet-header flex items-center justify-between gap-3 px-5 py-3.5 pe-[max(1.25rem,env(safe-area-inset-right,0px))]">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-base font-semibold text-foreground"
            dir="auto"
          >
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            {headerExtra}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              {...passwordManagerSafeControlProps}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label={closeLabel}
              title={closeLabel}
            >
              ✕
            </button>
          </div>
        </div>
        <div
          ref={bodyRef}
          className={`ui-simple-sheet-body px-5 py-4 ${bodyClassName ?? ""}`}
        >
          {children}
        </div>
        {footer ? (
          <div className="ui-simple-sheet-footer px-5 pt-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
