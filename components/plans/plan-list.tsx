import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import { formatDateRange } from "@/lib/dates";
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
      <p className="rounded-2xl border border-dashed border-stone-200 bg-white/70 px-5 py-8 text-center text-sm text-stone-500">
        {emptyMessage}
      </p>
    );
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    plans: plans.filter((plan) => plan.type === type),
  })).filter((group) => group.plans.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.type}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500">
            {getPlanTypeLabel(group.type)}
          </h2>
          <ul className="space-y-2">
            {group.plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/plans/${plan.id}`}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900" dir="auto">
                      {plan.title}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDateRange(plan.dateStart, plan.dateEnd)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-stone-400">
                    {plan.itemCount} item{plan.itemCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
