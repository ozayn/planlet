"use client";

import type { PlanItemView } from "@/app/generated/prisma/client";

import { IntentionItemCard } from "@/components/plans/intention-item-card";
import { NoteItemCard } from "@/components/plans/note-item-card";
import { SortablePlanItemList } from "@/components/plans/sortable-plan-item-list";
import { partitionPlanItems } from "@/lib/plan-item-sections";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type PlanItemSectionsProps = {
  planId: string;
  items: SerializedPlanItem[];
  itemView?: PlanItemView;
  canEdit?: boolean;
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
}: PlanItemSectionsProps) {
  const { tasks, intentions, notes } = partitionPlanItems(items);
  if (tasks.length === 0 && intentions.length === 0 && notes.length === 0) {
    return null;
  }

  return (
    <div className="ui-plan-item-sections space-y-6">
      {tasks.length > 0 ? (
        <section className="ui-plan-section space-y-2">
          <SectionLabel>Tasks</SectionLabel>
          <SortablePlanItemList
            planId={planId}
            items={tasks}
            sectionGroup="tasks"
            itemView={itemView}
            canEdit={canEdit}
          />
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
