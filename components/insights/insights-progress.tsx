import type { MonthlyInsightsTotals } from "@/lib/insights";

type InsightsProgressProps = {
  totals: MonthlyInsightsTotals;
};

type ProgressRow = {
  label: string;
  count: number;
};

function getProgressRows(totals: MonthlyInsightsTotals): ProgressRow[] {
  const rows: ProgressRow[] = [
    { label: "Completed", count: totals.done },
    { label: "Partial", count: totals.partial },
    { label: "Not done", count: totals.notDone },
    { label: "Released", count: totals.released },
    { label: "Open", count: totals.open },
    { label: "Moved", count: totals.moved },
    { label: "Skipped", count: totals.skipped },
  ];

  return rows.filter((row) => row.count > 0);
}

export function InsightsProgress({ totals }: InsightsProgressProps) {
  const rows = getProgressRows(totals);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Progress</h2>
      <ul className="ui-insights-progress-list">
        {rows.map((row) => (
          <li key={row.label} className="ui-insights-progress-row">
            <span className="text-muted">{row.label}:</span>
            <span className="tabular-nums text-foreground">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
