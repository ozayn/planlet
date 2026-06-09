import Link from "next/link";

export function InsightsEmptyState() {
  return (
    <article className="ui-empty-state space-y-6">
      <p className="text-sm text-muted">
        Nothing to reflect on yet this month.
      </p>
      <Link href="/today" className="ui-btn-primary inline-flex">
        Go to Today
      </Link>
      <p className="text-xs text-muted-light">
        These are observations, not grades.
      </p>
    </article>
  );
}
