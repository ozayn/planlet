import { PlanListItem } from "@/components/plans/plan-list-item";
import type { PlanType } from "@/app/generated/prisma/client";

export type PlanListEntry = {
  id: string;
  title: string;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
  updatedAt: Date;
};

type RecentPlanListProps = {
  plans: PlanListEntry[];
};

export function RecentPlanList({ plans }: RecentPlanListProps) {
  const sorted = [...plans].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <ul className="ui-plan-list divide-y divide-border-soft/70 rounded-lg border border-border-soft/80 bg-surface/60">
      {sorted.map((plan) => (
        <PlanListItem
          key={plan.id}
          id={plan.id}
          title={plan.title}
          type={plan.type}
          dateStart={plan.dateStart}
          dateEnd={plan.dateEnd}
          itemCount={plan.itemCount}
          updatedAt={plan.updatedAt}
        />
      ))}
    </ul>
  );
}
