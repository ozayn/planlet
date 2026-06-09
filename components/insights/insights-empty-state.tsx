import Link from "next/link";

export function InsightsEmptyState() {
  return (
    <article className="ui-empty-state">
      <p className="text-sm leading-relaxed text-muted">
        Nothing to reflect on yet this month. Add plans and items, and gentle
        observations will appear here.
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
