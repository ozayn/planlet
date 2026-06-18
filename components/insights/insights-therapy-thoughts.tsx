import Link from "next/link";

import type { MonthlyInsightsTherapyThoughts } from "@/lib/insights";

type InsightsTherapyThoughtsProps = {
  therapyThoughts: MonthlyInsightsTherapyThoughts;
};

export function InsightsTherapyThoughts({
  therapyThoughts,
}: InsightsTherapyThoughtsProps) {
  if (therapyThoughts.count === 0) {
    return null;
  }

  const countLabel =
    therapyThoughts.count === 1
      ? "1 entry this month"
      : `${therapyThoughts.count} entries this month`;

  const recent = therapyThoughts.recent.filter((thought) => thought.body);

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Therapy thoughts</h2>
      <p className="text-sm text-muted">{countLabel}</p>
      {recent.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-light">Recent entries</p>
          <ul className="ui-insights-bullet-list">
            {recent.map((thought) => (
              <li key={thought.id} className="ui-insights-bullet-item" dir="auto">
                {thought.body}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href="/therapy-thoughts" className="ui-text-link text-xs">
        View all therapy thoughts
      </Link>
    </section>
  );
}
