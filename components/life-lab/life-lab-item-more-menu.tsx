"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { MoreHorizontalIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LifeLabItemMoreMenuProps = {
  children: ReactNode;
  ariaLabel?: string;
  title?: string;
  align?: "start" | "end";
};

export function LifeLabItemMoreMenu({
  children,
  ariaLabel = ACTION_LABELS.moreLifeLabItem.ariaLabel,
  title = ACTION_LABELS.moreLifeLabItem.title,
  align = "end",
}: LifeLabItemMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      data-life-lab-more-menu=""
    >
      <button
        type="button"
        {...passwordManagerSafeControlProps}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={ariaLabel}
        title={title}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="ui-icon-action-quiet"
      >
        <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
        <span className="ui-tooltip-bubble" role="tooltip">
          {title}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className={`ui-floating-menu-panel absolute z-50 mt-1 min-w-40 rounded-xl border border-border-soft bg-surface py-1 ui-shadow-elevated ${
            align === "end" ? "end-0" : "start-0"
          }`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
