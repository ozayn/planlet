"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlanItemView, TaskOrganizationDisplay } from "@/app/generated/prisma/client";

import { createPlanItemAction } from "@/app/(app)/plans/actions";
import { SortablePlanItemList } from "@/components/plans/sortable-plan-item-list";
import { UNCATEGORIZED_LIFE_AREA_ID } from "@/lib/life-areas/constants";
import { groupPlanItemsByPrimaryLifeArea } from "@/lib/life-areas/group";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import {
  getMutationError,
  invokeServerAction,
} from "@/lib/invoke-server-action";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import { partitionPlanItems } from "@/lib/plan-item-sections";
import type { SerializedPlanItem } from "@/lib/plan-serialize";
import type { ThemeProjectCatalog } from "@/lib/theme-project-types";
import { EMPTY_THEME_PROJECT_CATALOG } from "@/lib/theme-project-types";

type PlanLifeAreaSectionsProps = {
  planId: string;
  items: SerializedPlanItem[];
  lifeAreas: SerializedLifeArea[];
  itemView?: PlanItemView;
  canEdit?: boolean;
  sourcePlanDate?: string;
  themeProjectCatalog?: ThemeProjectCatalog;
  taskOrganizationDisplay?: TaskOrganizationDisplay;
  moveCompletedToTop?: boolean;
};

export function PlanLifeAreaSections({
  planId,
  items,
  lifeAreas,
  itemView = "MINIMAL",
  canEdit = true,
  sourcePlanDate,
  themeProjectCatalog = EMPTY_THEME_PROJECT_CATALOG,
  taskOrganizationDisplay = "ASSIGNED_ONLY",
  moveCompletedToTop = true,
}: PlanLifeAreaSectionsProps) {
  const router = useRouter();
  const tasks = useMemo(() => partitionPlanItems(items).tasks, [items]);
  const groups = useMemo(
    () =>
      groupPlanItemsByPrimaryLifeArea(tasks, lifeAreas, {
        includeEmptyAreas: true,
      }),
    [tasks, lifeAreas],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    new Set(
      groups
        .filter((group) => group.items.length > 0)
        .map((group) => group.areaId),
    ),
  );
  const [addingAreaId, setAddingAreaId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOpenIds((current) => {
      let changed = false;
      const next = new Set(current);
      for (const group of groups) {
        if (group.items.length > 0 && !next.has(group.areaId)) {
          // Newly populated areas open by default.
          next.add(group.areaId);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [groups]);

  function toggleOpen(areaId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  }

  function startAdd(areaId: string) {
    setError(null);
    setAddingAreaId(areaId);
    setDraft("");
    setOpenIds((current) => new Set(current).add(areaId));
  }

  function submitAdd(areaId: string) {
    const title = draft.trim();
    if (!title) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const invoked = await invokeServerAction(() =>
        createPlanItemAction({
          planId,
          title,
          type: "TASK",
          primaryLifeAreaId:
            areaId === UNCATEGORIZED_LIFE_AREA_ID ? null : areaId,
        }),
      );
      const mutationError = getMutationError(invoked);
      if (mutationError) {
        setError(mutationError.message);
        return;
      }
      setDraft("");
      setAddingAreaId(null);
      router.refresh();
    });
  }

  if (groups.length === 0) {
    return <p className="text-sm text-muted">No Life Areas yet.</p>;
  }

  return (
    <div className="space-y-2 overflow-x-hidden">
      {groups.map((group) => {
        const isUncategorized = group.areaId === UNCATEGORIZED_LIFE_AREA_ID;
        const hasTasks = group.items.length > 0;
        const open = openIds.has(group.areaId);
        const isAdding = addingAreaId === group.areaId;
        const showBody = open || isAdding;

        if (!hasTasks && !isUncategorized) {
          return (
            <section key={group.areaId} className="space-y-1">
              <div className="flex min-h-11 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-muted">
                  {group.areaName}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                    disabled={pending}
                    aria-label={`Add task to ${group.areaName}`}
                    onClick={() => startAdd(group.areaId)}
                    {...passwordManagerSafeControlProps}
                  >
                    + Add
                  </button>
                ) : null}
              </div>
              {isAdding && canEdit ? (
                <AreaQuickAdd
                  draft={draft}
                  pending={pending}
                  onDraftChange={setDraft}
                  onSubmit={() => submitAdd(group.areaId)}
                  onCancel={() => {
                    setAddingAreaId(null);
                    setDraft("");
                  }}
                />
              ) : null}
            </section>
          );
        }

        return (
          <section key={group.areaId} className="space-y-2">
            <div className="flex min-h-11 items-center gap-1">
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left"
                aria-expanded={open}
                onClick={() => toggleOpen(group.areaId)}
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {group.areaName}
                  {group.archived ? (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      archived
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {group.items.length}
                  <span className="ml-2" aria-hidden="true">
                    {open ? "▾" : "▸"}
                  </span>
                </span>
              </button>
              {canEdit && !isUncategorized ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                  disabled={pending}
                  aria-label={`Add task to ${group.areaName}`}
                  onClick={() => startAdd(group.areaId)}
                  {...passwordManagerSafeControlProps}
                >
                  + Add
                </button>
              ) : null}
            </div>

            {showBody ? (
              <div className="space-y-2">
                {isAdding && canEdit && !isUncategorized ? (
                  <AreaQuickAdd
                    draft={draft}
                    pending={pending}
                    onDraftChange={setDraft}
                    onSubmit={() => submitAdd(group.areaId)}
                    onCancel={() => {
                      setAddingAreaId(null);
                      setDraft("");
                    }}
                  />
                ) : null}
                {hasTasks && open ? (
                  <SortablePlanItemList
                    planId={planId}
                    items={group.items}
                    sectionGroup="tasks"
                    itemView={itemView}
                    canEdit={canEdit}
                    sourcePlanDate={sourcePlanDate}
                    themeProjectCatalog={themeProjectCatalog}
                    taskOrganizationDisplay={taskOrganizationDisplay}
                    moveCompletedToTop={moveCompletedToTop}
                    showLifeAreaAssign={canEdit && isUncategorized}
                    showLifeAreaChange={canEdit && !isUncategorized}
                  />
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}

function AreaQuickAdd({
  draft,
  pending,
  onDraftChange,
  onSubmit,
  onCancel,
}: {
  draft: string;
  pending: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={draft}
        disabled={pending}
        placeholder="What needs doing?"
        autoFocus
        className="ui-input min-h-11 flex-1 text-sm"
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") {
            onCancel();
          }
        }}
        {...passwordManagerSafeControlProps}
      />
      <button
        type="button"
        className="ui-btn-secondary min-h-11 px-3 text-sm"
        disabled={pending || !draft.trim()}
        onClick={onSubmit}
        {...passwordManagerSafeControlProps}
      >
        Add
      </button>
    </div>
  );
}
