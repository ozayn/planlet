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
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-light">
      {children}
    </h3>
  );
}

export function PlanItemSections({
  planId,
  items,
  itemView = "MINIMAL",
}: PlanItemSectionsProps) {
  const { tasks, intentions, notes } = partitionPlanItems(items);
  if (tasks.length === 0 && intentions.length === 0 && notes.length === 0) {
    return null;
  }

  return (
    <div className="ui-plan-item-sections space-y-5">
      {tasks.length > 0 ? (
        <section className="space-y-2">
          <SectionLabel>Tasks</SectionLabel>
          <SortablePlanItemList
            planId={planId}
            items={tasks}
            itemView={itemView}
          />
        </section>
      ) : null}

      {intentions.length > 0 ? (
        <section className="space-y-2">
          <SectionLabel>Intentions</SectionLabel>
          <ul className="space-y-1.5">
            {intentions.map((item) => (
              <li key={item.id}>
                <IntentionItemCard planId={planId} item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <section className="space-y-2">
          <SectionLabel>Notes & reflections</SectionLabel>
          <ul className="space-y-1.5">
            {notes.map((item) => (
              <li key={item.id}>
                <NoteItemCard planId={planId} item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
