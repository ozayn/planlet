import Link from "next/link";

import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";

export function PlansEmptyState() {
  return (
    <article className="space-y-6 rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-12 text-center">
      <div>
        <p className="text-sm leading-relaxed text-muted">
          No plans saved yet. Start with today&apos;s list, or paste messy notes
          on New plan.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <CreateTodayPlanButton />
        <Link href="/plans/new" className="ui-btn-secondary inline-flex">
          New plan
        </Link>
      </div>
    </article>
  );
}
