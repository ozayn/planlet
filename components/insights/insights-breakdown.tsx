type BreakdownRow = {
  label: string;
  count: number;
};

type InsightsBreakdownProps = {
  types: BreakdownRow[];
  statuses: BreakdownRow[];
};

function BreakdownGroup({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="ui-insights-breakdown-group">
      <h3 className="ui-insights-breakdown-label">{title}</h3>
      <ul className="ui-insights-breakdown-list">
        {rows.map((row) => (
          <li key={row.label} className="ui-insights-breakdown-row">
            <span className="min-w-0 truncate text-foreground" dir="auto">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightsBreakdown({ types, statuses }: InsightsBreakdownProps) {
  if (types.length === 0 && statuses.length === 0) {
    return null;
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-section-title">Breakdown</h2>
      <div className="ui-insights-breakdown rounded-lg border border-border-soft/80 bg-surface/60 px-3 py-2.5">
        <BreakdownGroup title="Types" rows={types} />
        <BreakdownGroup title="Status" rows={statuses} />
      </div>
    </section>
  );
}
