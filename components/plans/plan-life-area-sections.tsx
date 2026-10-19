"use client";

import { useState } from "react";
import type { PlanItemView, TaskOrganizationDisplay } from "@/app/generated/prisma/client";

import { SortablePlanItemList } from "@/components/plans/sortable-plan-item-list";
import { groupPlanItemsByPrimaryLifeArea } from "@/lib/life-areas/group";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
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
  const { tasks } = partitionPlanItems(items);
  const groups = groupPlanItemsByPrimaryLifeArea(tasks, lifeAreas);
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(groups.map((group) => group.areaId)),
  );

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted">No tasks in this plan.</p>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {groups.map((group) => {
        const open = openIds.has(group.areaId);
        return (
          <section key={group.areaId} className="space-y-2">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
              aria-expanded={open}
              onClick={() => {
                setOpenIds((current) => {
                  const next = new Set(current);
                  if (next.has(group.areaId)) {
                    next.delete(group.areaId);
                  } else {
                    next.add(group.areaId);
                  }
                  return next;
                });
              }}
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
            {open ? (
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
              />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
