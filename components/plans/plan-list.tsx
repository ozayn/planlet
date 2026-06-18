"use client";

import { useMemo, useState } from "react";

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

const RECENT_PLANS_INITIAL_COUNT = 5;

type RecentPlanListProps = {
  plans: PlanListEntry[];
};

export function RecentPlanList({ plans }: RecentPlanListProps) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [plans],
  );
  const hasMore = sorted.length > RECENT_PLANS_INITIAL_COUNT;
  const visible = expanded
    ? sorted
    : sorted.slice(0, RECENT_PLANS_INITIAL_COUNT);

  return (
    <div className="space-y-2">
      <ul className="ui-plan-list divide-y divide-border-soft/70 rounded-lg border border-border-soft/80 bg-surface/60">
        {visible.map((plan) => (
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
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="ui-text-link text-xs"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
