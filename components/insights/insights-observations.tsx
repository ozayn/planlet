type ObservationCategory = {
  category: string;
  label: string;
  count: number;
};

type InsightsObservationsProps = {
  count: number;
  categories: ObservationCategory[];
};

export function InsightsObservations({
  count,
  categories,
}: InsightsObservationsProps) {
  if (count === 0) {
    return null;
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-section-title">Private observations</h2>
      <p className="text-sm text-muted">
        {count === 1
          ? "1 this month — only visible to you."
          : `${count} this month — only visible to you.`}
      </p>
      {categories.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {categories.map((entry) => (
            <li
              key={entry.category}
              className="rounded-full bg-accent-cream/40 px-2.5 py-0.5 text-xs text-muted"
            >
              {entry.label} · {entry.count}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
