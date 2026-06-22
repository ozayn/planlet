import { InsightsBarChartGroup } from "@/components/insights/insights-bar-chart";

type InsightsThemeProjectBreakdownProps = {
  themes: Array<{ label: string; count: number }>;
  projects: Array<{ label: string; count: number }>;
};

export function InsightsThemeProjectBreakdown({
  themes,
  projects,
}: InsightsThemeProjectBreakdownProps) {
  if (themes.length === 0 && projects.length === 0) {
    return null;
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Themes & projects</h2>
      <InsightsBarChartGroup title="By theme" rows={themes} />
      <InsightsBarChartGroup title="By project" rows={projects} />
    </section>
  );
}
