export type InsightsBarChartRow = {
  label: string;
  count: number;
};

type InsightsBarChartProps = {
  rows: InsightsBarChartRow[];
};

function getMaxCount(rows: InsightsBarChartRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.count), 0);
}

export function InsightsBarChart({ rows }: InsightsBarChartProps) {
  const max = getMaxCount(rows);

  if (rows.length === 0 || max === 0) {
    return <p className="text-sm text-muted">No data yet.</p>;
  }

  return (
    <ul className="ui-insights-bar-chart" role="list">
      {rows.map((row) => {
        const widthPercent = (row.count / max) * 100;

        return (
          <li key={row.label} className="ui-insights-bar-row">
            <span className="ui-insights-bar-label truncate" dir="auto">
              {row.label}
            </span>
            <div
              className="ui-insights-bar-track"
              aria-hidden="true"
              role="presentation"
            >
              <div
                className="ui-insights-bar-fill"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="ui-insights-bar-count tabular-nums text-muted">
              {row.count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type InsightsBarChartGroupProps = {
  title: string;
  rows: InsightsBarChartRow[];
};

export function InsightsBarChartGroup({
  title,
  rows,
}: InsightsBarChartGroupProps) {
  return (
    <div className="ui-insights-subsection">
      <h3 className="ui-insights-subheading">{title}</h3>
      <InsightsBarChart rows={rows} />
    </div>
  );
}
