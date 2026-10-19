"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  createLifeAreaAction,
  setPlanItemLifeAreasAction,
} from "@/app/(app)/life-areas/actions";
import { useLifeAreaCatalog } from "@/components/plans/life-area-catalog-context";
import { MAX_LIFE_AREA_NAME_LENGTH } from "@/lib/life-areas/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ItemLifeAreaAssignControlProps = {
  planId: string;
  itemId: string;
};

const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 280;

export function ItemLifeAreaAssignControl({
  planId,
  itemId,
}: ItemLifeAreaAssignControlProps) {
  const router = useRouter();
  const catalog = useLifeAreaCatalog();
  const menuId = useId();
  const createFieldId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: MENU_WIDTH,
  });

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

    function updatePosition() {
      if (!triggerRef.current) {
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(MENU_WIDTH, window.innerWidth - 16);
      let left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8,
      );
      let top = rect.bottom + 4;
      if (top + MENU_MAX_HEIGHT > window.innerHeight - 8) {
        top = Math.max(8, rect.top - MENU_MAX_HEIGHT - 4);
      }
      setMenuPosition({ top, left, width });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        document.getElementById(menuId)?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setCreating(false);
      setNewName("");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setCreating(false);
        setNewName("");
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

  function assignArea(lifeAreaId: string) {
    setError(null);
    setOpen(false);
    setCreating(false);
    setNewName("");
    startTransition(async () => {
      const result = await setPlanItemLifeAreasAction({
        planId,
        itemId,
        primaryLifeAreaId: lifeAreaId,
        secondaryLifeAreaIds: [],
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
      const assigned = await setPlanItemLifeAreasAction({
        planId,
        itemId,
        primaryLifeAreaId: created.area.id,
        secondaryLifeAreaIds: [],
      });
      if (!assigned.success) {
        setError(assigned.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
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
          setOpen((current) => !current);
          setCreating(false);
          setNewName("");
        }}
        {...passwordManagerSafeControlProps}
      >
        + Area
      </button>

      {mounted && open
        ? createPortal(
            <div
              id={menuId}
              role="menu"
              aria-label="Assign Life Area"
              className="fixed z-[80] overflow-y-auto rounded-xl border border-border-soft bg-surface p-1 shadow-lg"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: MENU_MAX_HEIGHT,
              }}
            >
              {activeAreas.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">No areas yet.</p>
              ) : (
                <ul className="space-y-0.5">
                  {activeAreas.map((area) => (
                    <li key={area.id}>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-accent-cream disabled:opacity-40"
                        disabled={pending}
                        onClick={() => assignArea(area.id)}
                        {...passwordManagerSafeControlProps}
                      >
                        {area.name}
                      </button>
                    </li>
                  ))}
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

              {error ? (
                <p className="px-3 py-2 text-sm text-accent-red">{error}</p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
