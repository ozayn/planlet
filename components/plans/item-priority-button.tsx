"use client";

import type { PriorityLevel } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { updatePlanItemImportanceUrgencyAction } from "@/app/(app)/plans/actions";
import { CheckIcon, FlagIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
import {
  getPriorityQuadrantChoice,
  getPriorityRowLabel,
  isPriorityUnset,
  PRIORITY_QUADRANT_CHOICES,
  resolveSelectedQuadrantKey,
  type PriorityQuadrantKey,
} from "@/lib/item-priority";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

const MENU_WIDTH = 220;
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;

type MenuPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

type ItemPriorityButtonProps = {
  planId: string;
  itemId: string;
  importance: PriorityLevel | null;
  urgency: PriorityLevel | null;
  canEdit?: boolean;
};

export function ItemPriorityButton({
  planId,
  itemId,
  importance,
  urgency,
  canEdit = true,
}: ItemPriorityButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: 0,
    width: MENU_WIDTH,
  });
  const [isPending, startTransition] = useTransition();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSet = !isPriorityUnset(importance, urgency);
  const selectedKey = resolveSelectedQuadrantKey(importance, urgency);
  const rowLabel = getPriorityRowLabel(importance, urgency);
  const rowShortLabel = getPriorityRowLabel(importance, urgency, { short: true });
  const triggerAriaLabel = isSet
    ? `Importance and urgency: ${rowLabel}`
    : ACTION_LABELS.importanceUrgency.ariaLabel;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = Math.max(rect.width, MENU_WIDTH);
      const menuHeight =
        menuRef.current?.offsetHeight ??
        PRIORITY_QUADRANT_CHOICES.length * 52 + 56;

      const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - VIEWPORT_PADDING),
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

  function applyQuadrant(key: PriorityQuadrantKey | null) {
    if (isPending) {
      return;
    }

    const nextImportance = key
      ? getPriorityQuadrantChoice(key).importance
      : null;
    const nextUrgency = key ? getPriorityQuadrantChoice(key).urgency : null;

    if (nextImportance === importance && nextUrgency === urgency) {
      setOpen(false);
      return;
    }

    setOpen(false);

    startTransition(async () => {
      await updatePlanItemImportanceUrgencyAction({
        planId,
        itemId,
        importance: nextImportance,
        urgency: nextUrgency,
      });
      router.refresh();
    });
  }

  if (!canEdit && !isSet) {
    return null;
  }

  if (!canEdit && isSet) {
    return (
      <span
        className="ui-priority-readonly shrink-0 rounded-full border border-border-soft/80 bg-surface/60 px-2 py-1 text-[0.6875rem] font-medium text-muted"
        title={rowLabel ?? undefined}
      >
        <span className="hidden md:inline">{rowLabel}</span>
        <span className="md:hidden">{rowShortLabel}</span>
      </span>
    );
  }

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={ACTION_LABELS.importanceUrgency.ariaLabel}
            className="ui-floating-menu-panel ui-priority-menu ui-shadow-elevated fixed z-[70] rounded-xl border border-border bg-surface py-1"
            style={{
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              left: menuPosition.left,
              width: menuPosition.width,
              maxWidth: "calc(100vw - 1rem)",
            }}
          >
            {PRIORITY_QUADRANT_CHOICES.map((choice) => {
              const selected = selectedKey === choice.key;

              return (
                <button
                  key={choice.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={`${choice.label}, ${choice.description}`}
                  disabled={isPending}
                  onClick={() => applyQuadrant(choice.key)}
                  className={`flex w-full min-h-11 items-center gap-2.5 px-3 py-2 text-start transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none disabled:opacity-50 ${
                    selected ? "bg-accent-cream/70" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-tight text-foreground">
                      {choice.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted">
                      {choice.description}
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
            {isSet ? (
              <>
                <div
                  className="my-1 border-t border-border-soft"
                  role="separator"
                />
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => applyQuadrant(null)}
                  className="flex w-full min-h-10 items-center px-3 py-2 text-sm text-muted transition-colors hover:bg-accent-cream focus-visible:bg-accent-cream focus-visible:outline-none disabled:opacity-50"
                >
                  Clear
                </button>
              </>
            ) : null}
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
        aria-label={triggerAriaLabel}
        title={isSet ? rowLabel ?? undefined : ACTION_LABELS.importanceUrgency.title}
        onClick={() => setOpen((current) => !current)}
        className={`ui-priority-trigger inline-flex max-w-[5.5rem] items-center gap-1 rounded-full border px-2 py-1 text-[0.6875rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-50 sm:max-w-[7rem] ${
          isSet
            ? "border-border-soft bg-accent-cream/50 text-foreground hover:border-border hover:bg-accent-cream"
            : "border-transparent bg-transparent text-muted-light hover:border-border-soft hover:bg-accent-cream/40 hover:text-muted"
        } ${open ? "ui-priority-trigger-open" : ""}`}
      >
        <FlagIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {isSet ? (
          <>
            <span className="hidden min-w-0 truncate sm:inline">
              {rowLabel}
            </span>
            <span className="min-w-0 truncate sm:hidden">{rowShortLabel}</span>
          </>
        ) : (
          <span className="hidden min-w-0 truncate md:inline">Priority</span>
        )}
      </button>
      {menu}
    </div>
  );
}
