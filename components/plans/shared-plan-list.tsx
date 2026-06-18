import Link from "next/link";

import { formatSharedPlanSubline } from "@/lib/plan-list-meta";
import type { SharedPlanEntry } from "@/lib/plan-sharing";

type SharedPlanListProps = {
  plans: SharedPlanEntry[];
};

export function SharedPlanList({ plans }: SharedPlanListProps) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <ul className="ui-plan-list divide-y divide-border-soft/70 rounded-lg border border-border-soft/80 bg-surface/60">
      {plans.map((plan) => (
        <li key={plan.shareId}>
          <Link
            href={`/plans/${plan.planId}`}
            className="ui-plan-list-row block min-h-11"
          >
            <p
              className="truncate text-sm font-medium text-foreground"
              dir="auto"
            >
              {plan.title}
            </p>
            <p className="truncate text-xs text-muted-light" dir="auto">
              {formatSharedPlanSubline({
                ownerName: plan.ownerName,
                ownerEmail: plan.ownerEmail,
                type: plan.type,
                dateStart: plan.dateStart,
                dateEnd: plan.dateEnd,
                itemCount: plan.itemCount,
              })}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
