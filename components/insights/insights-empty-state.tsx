import Link from "next/link";

export function InsightsEmptyState() {
  return (
    <article className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-12 text-center">
      <p className="text-sm leading-relaxed text-muted">
        Nothing to reflect on yet this month. When you add plans and items,
        gentle observations will appear here.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/today" className="ui-btn-secondary inline-flex">
          Go to Today
        </Link>
        <Link href="/plans/new" className="ui-btn-primary inline-flex">
          New plan
        </Link>
      </div>
    </article>
  );
}
