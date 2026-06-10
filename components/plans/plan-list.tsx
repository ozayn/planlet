import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import {
  formatDateRange,
  formatDateString,
  formatWeekStartString,
} from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";

export type PlanListEntry = {
  id: string;
  title: string;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
};

type PlanListProps = {
  plans: PlanListEntry[];
  emptyMessage?: string;
};

const TYPE_ORDER: PlanType[] = ["DAY", "WEEK", "MONTH", "YEAR"];

export function PlanList({
  plans,
  emptyMessage = "No plans yet. Create one to get started.",
}: PlanListProps) {
  if (plans.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    plans: plans.filter((plan) => plan.type === type),
  })).filter((group) => group.plans.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.type}>
          <h2 className="ui-label mb-4">{getPlanTypeLabel(group.type)}</h2>
          <ul className="space-y-2">
            {group.plans.map((plan) => {
              const href =
                plan.type === "DAY"
                  ? `/plans/day/${formatDateString(plan.dateStart)}`
                  : plan.type === "WEEK"
                    ? `/plans/week/${formatWeekStartString(plan.dateStart)}`
                    : `/plans/${plan.id}`;

              return (
              <li key={plan.id}>
                <Link
                  href={href}
                  className="ui-card flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent-cream/40"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      dir="auto"
                    >
                      {plan.title}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateRange(plan.dateStart, plan.dateEnd)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-light">
                    {plan.itemCount} item{plan.itemCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
