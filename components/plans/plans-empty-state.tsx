import Link from "next/link";

import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";

export function PlansEmptyState() {
  return (
    <article className="ui-empty-state space-y-6">
      <p className="text-sm leading-relaxed text-muted">
        No plans saved yet. Start with today&apos;s list or structure notes on
        New plan.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <CreateTodayPlanButton />
        <Link href="/plans/new" className="ui-btn-secondary inline-flex">
          New plan
        </Link>
      </div>
    </article>
  );
}
