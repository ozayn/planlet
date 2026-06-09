"use client";

import { AddItemForm } from "@/components/plans/add-item-form";
import { PlanItemCard } from "@/components/plans/plan-item-card";
import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { formatDateRange } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";
import type { SerializedPlan } from "@/lib/plan-serialize";

type PlanEditorProps = {
  plan: SerializedPlan;
  showMeta?: boolean;
  showShare?: boolean;
};

export function PlanEditor({
  plan,
  showMeta = true,
  showShare = false,
}: PlanEditorProps) {
  const dateStart = new Date(plan.dateStart);
  const dateEnd = new Date(plan.dateEnd);

  return (
    <div className="space-y-8">
      {showShare && !showMeta ? (
        <div className="flex justify-end">
          <SharePlanPanel plan={plan} />
        </div>
      ) : null}

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
      ) : null}

      <section className="space-y-3">
        {plan.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-10 text-center text-sm leading-relaxed text-muted">
            Start with a messy list. You can structure it later.
          </p>
        ) : (
          plan.items.map((item) => (
            <PlanItemCard key={item.id} planId={plan.id} item={item} />
          ))
        )}
      </section>

      <section className="space-y-2">
        <AddItemForm planId={plan.id} />
        <p className="text-xs text-muted-light">Good enough counts.</p>
      </section>
    </div>
  );
}
