import Link from "next/link";

import { formatPlanDateLabel, formatWeekStartString } from "@/lib/dates";

type UpcomingWeekPlan = {
  id: string;
  title: string;
  dateStart: Date;
  dateEnd: Date;
  _count: { items: number };
};

type UpcomingWeekPlansProps = {
  plans: UpcomingWeekPlan[];
};

export function UpcomingWeekPlans({ plans }: UpcomingWeekPlansProps) {
  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-light">
        No upcoming weekly plans yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {plans.map((plan) => {
        const weekStart = formatWeekStartString(plan.dateStart);

        return (
          <li key={plan.id}>
            <Link
              href={`/plans/week/${weekStart}`}
              className="ui-plan-item block px-4 py-3 transition-colors hover:bg-accent-cream/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" dir="auto">
                    {plan.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatPlanDateLabel(plan.dateStart, "WEEK", plan.dateEnd)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-light">
                  {plan._count.items} item{plan._count.items === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
