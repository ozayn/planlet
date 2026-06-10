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
    <ul className="ui-plan-list space-y-0.5">
      {plans.map((plan) => (
        <li key={plan.shareId}>
          <Link href={`/plans/${plan.planId}`} className="ui-plan-list-row block">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
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
                  })}
                </p>
              </div>
              <span className="shrink-0 pt-0.5 text-sm tabular-nums text-muted-light">
                {plan.itemCount}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
