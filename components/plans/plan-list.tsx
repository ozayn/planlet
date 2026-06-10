import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import {
  formatDateRange,
  formatDateString,
  formatWeekStartString,
  getTodayRange,
  getWeekRange,
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
};

const TYPE_ORDER: PlanType[] = ["DAY", "WEEK", "MONTH", "YEAR"];

function sortPlansForType(plans: PlanListEntry[], type: PlanType): PlanListEntry[] {
  const filtered = plans.filter((plan) => plan.type === type);
  const now = new Date();

  if (type === "DAY") {
    const todayStart = getTodayRange(now).start.getTime();
    const upcoming = filtered
      .filter((plan) => plan.dateStart.getTime() >= todayStart)
      .sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
    const past = filtered
      .filter((plan) => plan.dateStart.getTime() < todayStart)
      .sort((a, b) => b.dateStart.getTime() - a.dateStart.getTime());

    return [...upcoming, ...past];
  }

  if (type === "WEEK") {
    const weekStart = getWeekRange(now).start.getTime();
    const upcoming = filtered
      .filter((plan) => plan.dateStart.getTime() >= weekStart)
      .sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
    const past = filtered
      .filter((plan) => plan.dateStart.getTime() < weekStart)
      .sort((a, b) => b.dateStart.getTime() - a.dateStart.getTime());

    return [...upcoming, ...past];
  }

  return filtered.sort(
    (a, b) => b.dateStart.getTime() - a.dateStart.getTime(),
  );
}

export function PlanList({ plans }: PlanListProps) {
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    plans: sortPlansForType(plans, type),
  })).filter((group) => group.plans.length > 0);

  return (
    <div className="space-y-5">
      {grouped.map((group) => (
        <section key={group.type}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-light">
            {getPlanTypeLabel(group.type)}
          </h3>
          <ul className="space-y-1.5">
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
                    className="ui-card flex min-h-11 items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent-cream/40"
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
