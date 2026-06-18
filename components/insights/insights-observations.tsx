import type { MonthlyInsightsObservation } from "@/lib/insights";

type ObservationCategory = {
  category: string;
  label: string;
  count: number;
};

type InsightsObservationsProps = {
  count: number;
  categories: ObservationCategory[];
  recent: MonthlyInsightsObservation[];
};

export function InsightsObservations({
  count,
  categories,
  recent,
}: InsightsObservationsProps) {
  if (count === 0) {
    return null;
  }

  const sortedCategories = [...categories].sort((a, b) => b.count - a.count);

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Observations</h2>
      <div className="ui-insights-subsection">
        <h3 className="ui-insights-subheading">Private observations</h3>
        <ul className="ui-insights-compact-list">
          {sortedCategories.map((entry) => (
            <li key={entry.category} className="ui-insights-compact-row">
              <span className="text-foreground">{entry.label}</span>
              <span className="tabular-nums text-muted">({entry.count})</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-light">Only visible to you.</p>
      </div>
      {recent.length > 0 ? (
        <div className="ui-insights-subsection">
          <h3 className="ui-insights-subheading">Recent observations</h3>
          <ul className="ui-insights-bullet-list">
            {recent.map((observation, index) => (
              <li
                key={`${observation.category}-${index}`}
                className="ui-insights-bullet-item"
                dir="auto"
              >
                {observation.body}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
