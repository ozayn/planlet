"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  createLifeAreaAction,
  setPlanItemPrimaryLifeAreaAction,
} from "@/app/(app)/life-areas/actions";
import { useLifeAreaCatalog } from "@/components/plans/life-area-catalog-context";
import { MAX_LIFE_AREA_NAME_LENGTH } from "@/lib/life-areas/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ItemLifeAreaAssignControlProps = {
  planId: string;
  itemId: string;
  /** assign = + Area; change = Change area from the task menu. */
  mode?: "assign" | "change";
  currentPrimaryLifeAreaId?: string | null;
  /** When false, only the menu is rendered (opened from context menu). */
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Anchor for positioning when the visible trigger is hidden. */
  anchorRef?: RefObject<HTMLElement | null>;
};

const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 320;

export function ItemLifeAreaAssignControl({
  planId,
  itemId,
  mode = "assign",
  currentPrimaryLifeAreaId = null,
  showTrigger = true,
  open: openProp,
  onOpenChange,
  anchorRef,
}: ItemLifeAreaAssignControlProps) {
  const router = useRouter();
  const catalog = useLifeAreaCatalog();
  const menuId = useId();
  const createFieldId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: MENU_WIDTH,
    bottomSheet: false,
  });

  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  const activeAreas = useMemo(
    () => catalog.filter((area) => !area.archivedAt),
    [catalog],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeMenu() {
      if (!isControlled) {
        setUncontrolledOpen(false);
      }
      onOpenChange?.(false);
      setCreating(false);
      setNewName("");
    }

    function updatePosition() {
      const anchor = showTrigger
        ? triggerRef.current
        : (anchorRef?.current ?? triggerRef.current);
      const width = Math.min(MENU_WIDTH, window.innerWidth - 16);
      const useBottomSheet = window.innerWidth < 640;

      if (useBottomSheet) {
        setMenuPosition({
          top: 0,
          left: 8,
          width: window.innerWidth - 16,
          bottomSheet: true,
        });
        return;
      }

      if (!anchor) {
        setMenuPosition({
          top: Math.max(8, window.innerHeight / 3),
          left: Math.max(8, (window.innerWidth - width) / 2),
          width,
          bottomSheet: false,
        });
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      let top = rect.bottom + 4;
      if (top + MENU_MAX_HEIGHT > window.innerHeight - 8) {
        top = Math.max(8, rect.top - MENU_MAX_HEIGHT - 4);
      }
      setMenuPosition({ top, left, width, bottomSheet: false });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        anchorRef?.current?.contains(target) ||
        document.getElementById(menuId)?.contains(target)
      ) {
        return;
      }
      closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
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
  }, [open, menuId, showTrigger, anchorRef, isControlled, onOpenChange]);

  function persistPrimary(lifeAreaId: string | null) {
    setError(null);
    setOpen(false);
    setCreating(false);
    setNewName("");
    startTransition(async () => {
      const result = await setPlanItemPrimaryLifeAreaAction({
        planId,
        itemId,
        primaryLifeAreaId: lifeAreaId,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function createAndAssign() {
    const name = newName.trim();
    if (!name) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const created = await createLifeAreaAction(name);
      if (!created.success) {
        setError(created.error);
        return;
      }
      setCreating(false);
      setNewName("");
      setOpen(false);
      const assigned = await setPlanItemPrimaryLifeAreaAction({
        planId,
        itemId,
        primaryLifeAreaId: created.area.id,
      });
      if (!assigned.success) {
        setError(assigned.error);
        return;
      }
      router.refresh();
    });
  }

  const menuLabel =
    mode === "change" ? "Change Life Area" : "Assign Life Area";

  const menu =
    mounted && open
      ? createPortal(
          <>
            {menuPosition.bottomSheet ? (
              <button
                type="button"
                className="fixed inset-0 z-[79] bg-black/25"
                aria-label="Close Life Area menu"
                onClick={() => {
                  setOpen(false);
                  setCreating(false);
                  setNewName("");
                }}
              />
            ) : null}
            <div
              id={menuId}
              role="menu"
              aria-label={menuLabel}
              className={
                menuPosition.bottomSheet
                  ? "fixed inset-x-2 bottom-2 z-[80] max-h-[70vh] overflow-y-auto rounded-2xl border border-border-soft bg-surface p-1 shadow-lg"
                  : "fixed z-[80] overflow-y-auto rounded-xl border border-border-soft bg-surface p-1 shadow-lg"
              }
              style={
                menuPosition.bottomSheet
                  ? undefined
                  : {
                      top: menuPosition.top,
                      left: menuPosition.left,
                      width: menuPosition.width,
                      maxHeight: MENU_MAX_HEIGHT,
                    }
              }
            >
              {activeAreas.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">No areas yet.</p>
              ) : (
                <ul className="space-y-0.5">
                  {activeAreas.map((area) => {
                    const selected = area.id === currentPrimaryLifeAreaId;
                    return (
                      <li key={area.id}>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream disabled:opacity-40"
                          disabled={pending || selected}
                          onClick={() => persistPrimary(area.id)}
                          {...passwordManagerSafeControlProps}
                        >
                          <span>{area.name}</span>
                          {selected ? (
                            <span className="text-xs text-muted">Current</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-1 border-t border-border-soft pt-1">
                {creating ? (
                  <div className="space-y-2 px-1 py-1">
                    <label
                      className="block space-y-1 text-sm"
                      htmlFor={createFieldId}
                    >
                      <span className="sr-only">New Life Area name</span>
                      <input
                        id={createFieldId}
                        className="ui-input w-full min-h-11"
                        value={newName}
                        maxLength={MAX_LIFE_AREA_NAME_LENGTH}
                        disabled={pending}
                        placeholder="Name"
                        autoFocus
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            createAndAssign();
                          }
                        }}
                        {...passwordManagerSafeControlProps}
                      />
                    </label>
                    <button
                      type="button"
                      className="ui-btn-secondary min-h-11 w-full"
                      disabled={pending || !newName.trim()}
                      onClick={createAndAssign}
                      {...passwordManagerSafeControlProps}
                    >
                      Create
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                    disabled={pending}
                    onClick={() => setCreating(true)}
                    {...passwordManagerSafeControlProps}
                  >
                    + Create new area
                  </button>
                )}
              </div>

              {mode === "change" ? (
                <div className="mt-1 border-t border-border-soft pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                    disabled={pending}
                    onClick={() => persistPrimary(null)}
                    {...passwordManagerSafeControlProps}
                  >
                    Remove from Life Area
                  </button>
                </div>
              ) : null}

              {error ? (
                <p className="px-3 py-2 text-sm text-accent-red">{error}</p>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {showTrigger ? (
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setError(null);
            setOpen(!open);
            setCreating(false);
            setNewName("");
          }}
          {...passwordManagerSafeControlProps}
        >
          + Area
        </button>
      ) : null}

      {menu}

      {!showTrigger && error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
