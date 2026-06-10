import Link from "next/link";

import { formatDateRange } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";
import type { SharedPlanEntry } from "@/lib/plan-sharing";

type SharedPlanListProps = {
  plans: SharedPlanEntry[];
};

export function SharedPlanList({ plans }: SharedPlanListProps) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1.5">
      {plans.map((plan) => (
        <li key={plan.shareId}>
          <Link
            href={`/plans/${plan.planId}`}
            className="ui-card block border-s-2 border-s-accent-blue/35 px-3 py-2.5 transition-colors hover:bg-accent-cream/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="truncate text-sm font-medium text-foreground"
                    dir="auto"
                  >
                    {plan.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-accent-cream px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted">
                    Shared
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {getPlanTypeLabel(plan.type)} ·{" "}
                  {formatDateRange(plan.dateStart, plan.dateEnd)}
                </p>
                <p className="mt-0.5 text-xs text-muted-light" dir="auto">
                  From {plan.ownerName ?? plan.ownerEmail ?? "another user"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-light">
                {plan.itemCount} item{plan.itemCount === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
