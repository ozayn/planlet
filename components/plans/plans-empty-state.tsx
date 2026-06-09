import Link from "next/link";

import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";

export function PlansEmptyState() {
  return (
    <article className="space-y-6 rounded-2xl border border-dashed border-stone-200 bg-white/70 px-5 py-10 text-center">
      <div>
        <p className="text-sm leading-relaxed text-stone-600">
          No plans saved yet. Start with today&apos;s list, or paste messy notes
          on New plan.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <CreateTodayPlanButton />
        <Link
          href="/plans/new"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 hover:border-stone-300"
        >
          New plan
        </Link>
      </div>
    </article>
  );
}
