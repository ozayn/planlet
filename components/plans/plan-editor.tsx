"use client";

import Link from "next/link";

import { AddItemForm } from "@/components/plans/add-item-form";
import { PlanItemCard } from "@/components/plans/plan-item-card";
import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { ShareWithUserPanel } from "@/components/plans/share-with-user-panel";
import { formatDateRange } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";
import type { SerializedPlan } from "@/lib/plan-serialize";

type PlanShareEntry = {
  id: string;
  sharedWithUser: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type PlanEditorProps = {
  plan: SerializedPlan;
  showMeta?: boolean;
  showShare?: boolean;
  platformShares?: PlanShareEntry[];
};

export function PlanEditor({
  plan,
  showMeta = true,
  showShare = false,
  platformShares = [],
}: PlanEditorProps) {
  const dateStart = new Date(plan.dateStart);
  const dateEnd = new Date(plan.dateEnd);
  const itemCount = plan.items.length;

  return (
    <div className="space-y-8">
      {showMeta ? (
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h2
                className="text-xl font-semibold tracking-tight text-foreground"
                dir="auto"
              >
                {plan.title}
              </h2>
              <p className="text-sm text-muted">
                {getPlanTypeLabel(plan.type)} ·{" "}
                {formatDateRange(dateStart, dateEnd)}
                {itemCount > 0
                  ? ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            {showShare ? <SharePlanPanel plan={plan} /> : null}
          </div>
          {plan.summary ? (
            <p className="text-sm leading-relaxed text-muted" dir="auto">
              {plan.summary}
            </p>
          ) : null}
        </header>
      ) : (
        <header className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted">
            {formatDateRange(dateStart, dateEnd)}
            {itemCount > 0
              ? ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`
              : ""}
          </p>
          {showShare ? <SharePlanPanel plan={plan} /> : null}
        </header>
      )}

      <section className="space-y-3">
        {plan.items.length === 0 ? (
          <div className="ui-empty-state">
            <p className="text-sm leading-relaxed text-muted">
              Add an item below, or paste notes on{" "}
              <Link href="/plans/new" className="ui-text-link">
                New plan
              </Link>{" "}
              to structure first.
            </p>
          </div>
        ) : (
          plan.items.map((item) => (
            <PlanItemCard key={item.id} planId={plan.id} item={item} />
          ))
        )}
      </section>

      <section>
        <AddItemForm planId={plan.id} />
      </section>

      {showShare ? (
        <ShareWithUserPanel planId={plan.id} shares={platformShares} />
      ) : null}
    </div>
  );
}
