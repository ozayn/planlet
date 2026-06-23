"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type InfluenceNameTooltipProps = {
  label: string;
  description: string;
};

function subtitleFromDescription(description: string): string {
  const [firstPart] = description.split(" • ");
  return firstPart?.trim() || description;
}

function prefersHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function InfluenceNameTooltip({
  label,
  description,
}: InfluenceNameTooltipProps) {
  const [open, setOpen] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [canHover, setCanHover] = useState<boolean | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const subtitle = subtitleFromDescription(description);

  useEffect(() => {
    setMounted(true);
    setCanHover(prefersHover());
  }, []);

  useEffect(() => {
    if (!open) {
      setFadeIn(false);
      return;
    }

    setFadeIn(false);
    const frame = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const maxWidth = 240;
    const padding = 8;
    const left = Math.min(
      Math.max(padding, rect.left),
      window.innerWidth - maxWidth - padding,
    );

    setPosition({
      top: rect.bottom + 6,
      left,
    });
  }, []);

  const show = useCallback(() => {
    if (!canHover) {
      return;
    }

    updatePosition();
    setOpen(true);
  }, [canHover, updatePosition]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    function handleScrollOrResize() {
      updatePosition();
    }

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, updatePosition]);

  const tooltip =
    open && mounted && canHover
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={`pointer-events-none fixed z-[100] max-w-[240px] rounded-md border border-border-soft bg-surface px-2.5 py-1.5 text-xs leading-relaxed text-muted shadow-[var(--shadow-card)] transition-opacity duration-150 ease-out ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
            style={{ top: position.top, left: position.left }}
          >
            {description}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          ref={triggerRef}
          aria-describedby={open ? tooltipId : undefined}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          className="min-w-0 truncate underline decoration-transparent underline-offset-2 transition-[text-decoration-color] duration-150 hover:decoration-muted/40 focus-visible:decoration-muted/40 focus-visible:outline-none"
        >
          {label}
        </span>
        {canHover === false ? (
          <span className="text-xs leading-snug text-muted">{subtitle}</span>
        ) : null}
      </span>
      {tooltip}
    </>
  );
}
