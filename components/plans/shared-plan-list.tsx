import Link from "next/link";

import { formatDateRange } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";
import type { SharedPlanEntry } from "@/lib/plan-sharing";

type SharedPlanListProps = {
  plans: SharedPlanEntry[];
  emptyMessage?: string;
};

export function SharedPlanList({
  plans,
  emptyMessage = "No plans shared with you yet.",
}: SharedPlanListProps) {
  if (plans.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {plans.map((plan) => (
        <li key={plan.shareId}>
          <Link
            href={`/plans/${plan.planId}`}
            className="ui-card block px-4 py-3 transition-colors hover:bg-accent-cream/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground" dir="auto">
                  {plan.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {getPlanTypeLabel(plan.type)} ·{" "}
                  {formatDateRange(plan.dateStart, plan.dateEnd)}
                </p>
                <p className="mt-1 text-xs text-muted-light" dir="auto">
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
