"use client";

import type { PlanItemStatus, PlanItemView } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { updatePlanItemStatusAction } from "@/app/(app)/plans/actions";
import { PlanItemStatusVisual } from "@/components/plans/plan-item-status-visual";
import { isExpressiveItemView } from "@/lib/plan-item-view";
import { getStatusLabel, STATUS_STYLES } from "@/lib/plan-status";

const STATUSES: PlanItemStatus[] = [
  "OPEN",
  "DONE",
  "PARTIAL",
  "MOVED",
  "SKIPPED",
  "RELEASED",
];

const STATUS_DESCRIPTIONS: Record<PlanItemStatus, string> = {
  OPEN: "Not started yet",
  DONE: "Completed",
  PARTIAL: "Some progress",
  MOVED: "Moved to another time",
  SKIPPED: "Intentionally skipped",
  RELEASED: "Let go",
};

type StatusButtonProps = {
  planId: string;
  itemId: string;
  status: PlanItemStatus;
  compact?: boolean;
  itemView?: PlanItemView;
};

export function StatusButton({
  planId,
  itemId,
  status,
  compact = false,
  itemView = "MINIMAL",
}: StatusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isPending, startTransition] = useTransition();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentLabel = getStatusLabel(status);
  const isExpressive = isExpressiveItemView(itemView);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        document.getElementById(menuId)?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, menuId]);

  function selectStatus(nextStatus: PlanItemStatus) {
    if (nextStatus === status || isPending) {
      setOpen(false);
      return;
    }

    setOpen(false);

    startTransition(async () => {
      await updatePlanItemStatusAction({
        planId,
        itemId,
        status: nextStatus,
      });
      router.refresh();
    });
  }

  const triggerClass = isExpressive
    ? compact
      ? "min-h-8 min-w-[6.5rem] gap-1.5 px-2 text-xs sm:min-w-[7rem] sm:text-sm"
      : "min-h-10 min-w-[8rem] gap-2 px-2.5 text-sm"
    : compact
      ? "h-8 min-w-[5.5rem] max-w-[6.5rem] gap-1 px-2 text-[0.6875rem] sm:min-w-[6rem] sm:text-xs"
      : "min-h-10 min-w-[7.5rem] gap-1.5 px-2.5 text-sm";
  const iconClass = isExpressive
    ? "text-base leading-none"
    : "h-3.5 w-3.5";
  const menuIconClass = isExpressive ? "text-base leading-none" : "h-3.5 w-3.5";

  const menu =
    open && mounted
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label="Item status"
            className="ui-shadow-elevated fixed z-50 max-h-[min(20rem,calc(100vh-1rem))] overflow-y-auto rounded-xl border border-border bg-surface py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            {STATUSES.map((value) => {
              const selected = value === status;
              const description = STATUS_DESCRIPTIONS[value];

              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  disabled={isPending}
                  onClick={() => selectStatus(value)}
                  className={`flex w-full min-h-10 items-center gap-2.5 px-3 py-2 text-start transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none disabled:opacity-50 ${
                    selected ? "bg-accent-cream/70" : ""
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center ${STATUS_STYLES[value].icon}`}
                    aria-hidden="true"
                  >
                    <PlanItemStatusVisual
                      status={value}
                      itemView={itemView}
                      className={menuIconClass}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {getStatusLabel(value)}
                    </span>
                    <span className="block text-xs text-muted">
                      {description}
                    </span>
                  </span>
                  {selected ? (
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Item status, ${currentLabel}`}
        title={currentLabel}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center rounded-full border border-border-soft bg-surface/80 font-medium text-foreground transition-colors hover:border-border hover:bg-accent-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-50 ${STATUS_STYLES[status].icon} ${triggerClass}`}
      >
        <span
          className={`flex shrink-0 items-center justify-center ${
            isExpressive ? "" : "h-4 w-4"
          }`}
        >
          <PlanItemStatusVisual
            status={status}
            itemView={itemView}
            className={iconClass}
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-start">{currentLabel}</span>
        <ChevronIcon
          className={`h-3 w-3 shrink-0 text-muted-light transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}
