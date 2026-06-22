import {
  InsightsBarChartGroup,
  type InsightsBarChartRow,
} from "@/components/insights/insights-bar-chart";

type InsightsBreakdownProps = {
  types: InsightsBarChartRow[];
  statuses: InsightsBarChartRow[];
  themes?: InsightsBarChartRow[];
  projects?: InsightsBarChartRow[];
};

export function InsightsBreakdown({
  types,
  statuses,
  themes = [],
  projects = [],
}: InsightsBreakdownProps) {
  const hasThemes = themes.length > 0;
  const hasProjects = projects.length > 0;

  if (
    types.length === 0 &&
    statuses.length === 0 &&
    !hasThemes &&
    !hasProjects
  ) {
    return null;
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Patterns</h2>
      {types.length > 0 ? (
        <InsightsBarChartGroup title="Types" rows={types} />
      ) : null}
      {statuses.length > 0 ? (
        <InsightsBarChartGroup title="Status" rows={statuses} />
      ) : null}
      {hasThemes ? (
        <InsightsBarChartGroup title="Tasks by theme" rows={themes} />
      ) : null}
      {hasProjects ? (
        <InsightsBarChartGroup title="Tasks by project" rows={projects} />
      ) : null}
    </section>
  );
}
