"use client";

import type { PlanItemView, TaskOrganizationDisplay } from "@/app/generated/prisma/client";

import { IntentionItemCard } from "@/components/plans/intention-item-card";
import { NoteItemCard } from "@/components/plans/note-item-card";
import { PlanLifeAreaSections } from "@/components/plans/plan-life-area-sections";
import { SortablePlanItemList } from "@/components/plans/sortable-plan-item-list";
import type { PlanOrganizeViewValue } from "@/lib/life-areas/types";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import { partitionPlanItems } from "@/lib/plan-item-sections";
import type { SerializedPlanItem } from "@/lib/plan-serialize";
import type { ThemeProjectCatalog } from "@/lib/theme-project-types";
import { EMPTY_THEME_PROJECT_CATALOG } from "@/lib/theme-project-types";

type PlanItemSectionsProps = {
  planId: string;
  items: SerializedPlanItem[];
  itemView?: PlanItemView;
  canEdit?: boolean;
  sourcePlanDate?: string;
  themeProjectCatalog?: ThemeProjectCatalog;
  taskOrganizationDisplay?: TaskOrganizationDisplay;
  moveCompletedToTop?: boolean;
  organizeView?: PlanOrganizeViewValue;
  lifeAreas?: SerializedLifeArea[];
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="ui-section-label text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-light">
      {children}
    </h3>
  );
}

export function PlanItemSections({
  planId,
  items,
  itemView = "MINIMAL",
  canEdit = true,
  sourcePlanDate,
  themeProjectCatalog = EMPTY_THEME_PROJECT_CATALOG,
  taskOrganizationDisplay = "ASSIGNED_ONLY",
  moveCompletedToTop = true,
  organizeView = "LIST",
  lifeAreas = [],
}: PlanItemSectionsProps) {
  const { tasks, intentions, notes } = partitionPlanItems(items);
  const showLifeAreas = organizeView === "LIFE_AREAS";

  // Life Areas lists every active area (including empty), so it can render
  // even when the plan has no tasks yet.
  if (
    tasks.length === 0 &&
    intentions.length === 0 &&
    notes.length === 0 &&
    !showLifeAreas
  ) {
    return null;
  }

  return (
    <div className="ui-plan-item-sections space-y-6">
      {tasks.length > 0 || showLifeAreas ? (
        <section className="ui-plan-section space-y-2">
          {showLifeAreas ? null : <SectionLabel>Tasks</SectionLabel>}
          {showLifeAreas ? (
            <PlanLifeAreaSections
              planId={planId}
              items={items}
              lifeAreas={lifeAreas}
              itemView={itemView}
              canEdit={canEdit}
              sourcePlanDate={sourcePlanDate}
              themeProjectCatalog={themeProjectCatalog}
              taskOrganizationDisplay={taskOrganizationDisplay}
              moveCompletedToTop={moveCompletedToTop}
            />
          ) : (
            <SortablePlanItemList
              planId={planId}
              items={tasks}
              sectionGroup="tasks"
              itemView={itemView}
              canEdit={canEdit}
              sourcePlanDate={sourcePlanDate}
              themeProjectCatalog={themeProjectCatalog}
              taskOrganizationDisplay={taskOrganizationDisplay}
              moveCompletedToTop={moveCompletedToTop}
            />
          )}
        </section>
      ) : null}

      {intentions.length > 0 ? (
        <section className="ui-plan-section ui-plan-section-follows-tasks space-y-2">
          <SectionLabel>Intentions</SectionLabel>
          <ul className="space-y-1.5">
            {intentions.map((item, index) => (
              <li key={item.id}>
                <IntentionItemCard
                  planId={planId}
                  item={item}
                  canEdit={canEdit}
                  canMoveUp={canEdit && index > 0}
                  canMoveDown={canEdit && index < intentions.length - 1}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <section className="ui-plan-section space-y-2">
          <SectionLabel>Notes & reflections</SectionLabel>
          <p className="text-xs text-muted-light">
            Included when you share or copy this plan.
          </p>
          <ul className="space-y-1.5">
            {notes.map((item, index) => (
              <li key={item.id}>
                <NoteItemCard
                  planId={planId}
                  item={item}
                  canEdit={canEdit}
                  canMoveUp={canEdit && index > 0}
                  canMoveDown={canEdit && index < notes.length - 1}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
