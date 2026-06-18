"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatSharedPlanSubline } from "@/lib/plan-list-meta";
import type { SharedPlanEntry } from "@/lib/plan-sharing";

const SHARED_PLANS_INITIAL_COUNT = 3;

type SharedPlanListProps = {
  plans: SharedPlanEntry[];
};

export function SharedPlanList({ plans }: SharedPlanListProps) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [plans],
  );

  if (sorted.length === 0) {
    return null;
  }

  const hasMore = sorted.length > SHARED_PLANS_INITIAL_COUNT;
  const visible = expanded
    ? sorted
    : sorted.slice(0, SHARED_PLANS_INITIAL_COUNT);

  return (
    <div className="space-y-2">
      <ul className="ui-plan-list divide-y divide-border-soft/70 rounded-lg border border-border-soft/80 bg-surface/60">
        {visible.map((plan) => (
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
