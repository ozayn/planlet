import type { PlanType } from "@/app/generated/prisma/client";
import { PlanListItem } from "@/components/plans/plan-list-item";
import { getTodayRange, getWeekRange } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";

export type PlanListEntry = {
  id: string;
  title: string;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
  updatedAt: Date;
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
            {group.plans.map((plan) => (
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
        </section>
      ))}
    </div>
  );
}
