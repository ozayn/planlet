"use client";

import type { PlanItemStatus, PlanItemView } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { updatePlanItemStatusAction } from "@/app/(app)/plans/actions";
import { PlanItemStatusVisual } from "@/components/plans/plan-item-status-visual";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
import { isExpressiveItemView } from "@/lib/plan-item-view";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
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

const MOBILE_MENU_WIDTH = 176;
const DESKTOP_MENU_MIN_WIDTH = 220;
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;

type MenuPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

type StatusButtonProps = {
  planId: string;
  itemId: string;
  status: PlanItemStatus;
  compact?: boolean;
  itemView?: PlanItemView;
  /** Task cards: icon-only below md, pill at md+ */
  mobileIconOnly?: boolean;
};

function estimateMenuHeight(compactMenu: boolean): number {
  const rowHeight = compactMenu ? 44 : 56;
  return STATUSES.length * rowHeight + 8;
}

export function StatusButton({
  planId,
  itemId,
  status,
  compact = false,
  itemView = "MINIMAL",
  mobileIconOnly = false,
}: StatusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: 0,
    width: MOBILE_MENU_WIDTH,
  });
  const [isPending, startTransition] = useTransition();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
      const compactMenu = window.innerWidth < 640;
      const menuWidth = compactMenu
        ? MOBILE_MENU_WIDTH
        : Math.max(rect.width, DESKTOP_MENU_MIN_WIDTH);
      const menuHeight =
        menuRef.current?.offsetHeight ?? estimateMenuHeight(compactMenu);

      const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(rect.left, window.innerWidth - menuWidth - VIEWPORT_PADDING),
      );

      const spaceBelow =
        window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING;
      const spaceAbove = rect.top - MENU_GAP - VIEWPORT_PADDING;
      const openAbove = spaceBelow < menuHeight && spaceAbove >= spaceBelow;

      if (openAbove) {
        setMenuPosition({
          left,
          width: menuWidth,
          bottom: window.innerHeight - rect.top + MENU_GAP,
        });
      } else {
        setMenuPosition({
          left,
          width: menuWidth,
          top: rect.bottom + MENU_GAP,
        });
      }
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
    requestAnimationFrame(updatePosition);

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

  const triggerClass = mobileIconOnly
    ? isExpressive
      ? "text-xs md:min-h-8 md:min-w-[6.5rem] md:gap-1.5 md:px-2 md:text-xs"
      : "text-[0.6875rem] md:h-8 md:min-w-[5.5rem] md:max-w-[6.5rem] md:gap-1 md:px-2 md:text-xs"
    : isExpressive
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
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={ACTION_LABELS.itemStatus.ariaLabel}
            className="ui-status-menu ui-shadow-elevated fixed z-[70] max-h-[min(70dvh,20rem)] overflow-y-auto rounded-xl border border-border bg-surface py-1"
            style={{
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              left: menuPosition.left,
              width: menuPosition.width,
              maxWidth: "calc(100vw - 1rem)",
            }}
          >
            {STATUSES.map((value) => {
              const selected = value === status;
              const label = getStatusLabel(value);
              const description = STATUS_DESCRIPTIONS[value];

              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={`${label}, ${description}`}
                  disabled={isPending}
                  onClick={() => selectStatus(value)}
                  className={`flex w-full min-h-11 items-center gap-2.5 px-3 py-2 text-start transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none disabled:opacity-50 sm:min-h-10 sm:gap-2.5 sm:py-2 ${
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
                    <span className="block text-sm font-medium leading-tight text-foreground">
                      {label}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-tight text-muted sm:block">
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
        {...passwordManagerSafeControlProps}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Change status: ${currentLabel}`}
        title={currentLabel}
        onClick={() => setOpen((current) => !current)}
        className={`ui-status-trigger inline-flex items-center font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-50 ${STATUS_STYLES[status].icon} ${
          mobileIconOnly
            ? "ui-status-trigger-icon-only rounded-lg border-0 bg-transparent hover:bg-accent-cream md:rounded-full md:border md:border-border-soft md:bg-surface/80 md:hover:border-border"
            : "rounded-full border border-border-soft bg-surface/80 hover:border-border hover:bg-accent-cream"
        } ${triggerClass}`}
      >
        <span
          className={`ui-status-trigger-icon flex shrink-0 items-center justify-center ${
            isExpressive ? "" : "h-4 w-4"
          }`}
        >
          <PlanItemStatusVisual
            status={status}
            itemView={itemView}
            className={iconClass}
          />
        </span>
        <span className="ui-status-trigger-label min-w-0 flex-1 truncate text-start">
          {currentLabel}
        </span>
        <ChevronDownIcon
          className={`ui-status-trigger-chevron h-3 w-3 shrink-0 text-muted-light transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}
