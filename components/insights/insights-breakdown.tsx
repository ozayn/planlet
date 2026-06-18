import {
  InsightsBarChartGroup,
  type InsightsBarChartRow,
} from "@/components/insights/insights-bar-chart";

type InsightsBreakdownProps = {
  types: InsightsBarChartRow[];
  statuses: InsightsBarChartRow[];
};

export function InsightsBreakdown({
  types,
  statuses,
}: InsightsBreakdownProps) {
  if (types.length === 0 && statuses.length === 0) {
    return null;
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Patterns</h2>
      <InsightsBarChartGroup title="Types" rows={types} />
      <InsightsBarChartGroup title="Status" rows={statuses} />
    </section>
  );
}
