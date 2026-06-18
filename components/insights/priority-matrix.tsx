import {
  InsightsBarChart,
  type InsightsBarChartRow,
} from "@/components/insights/insights-bar-chart";
import type { MonthlyInsights } from "@/lib/insights";

type PriorityMatrixProps = {
  quadrants: MonthlyInsights["priorityQuadrants"];
};

const QUADRANTS = [
  { key: "doSoon" as const, title: "Do soon" },
  { key: "protectTime" as const, title: "Protect time" },
  { key: "contain" as const, title: "Contain" },
  { key: "maybeRelease" as const, title: "Maybe release" },
] as const;

function getPriorityRows(
  quadrants: MonthlyInsights["priorityQuadrants"],
): InsightsBarChartRow[] {
  return QUADRANTS.map((quadrant) => ({
    label: quadrant.title,
    count: quadrants[quadrant.key],
  }));
}

export function PriorityMatrix({ quadrants }: PriorityMatrixProps) {
  const rows = getPriorityRows(quadrants);
  const classified =
    quadrants.doSoon +
    quadrants.protectTime +
    quadrants.contain +
    quadrants.maybeRelease;

  if (classified === 0) {
    return (
      <section className="ui-insights-section">
        <h2 className="ui-insights-heading">Priority</h2>
        <p className="text-sm text-muted">
          You haven&apos;t been using priority labels much yet.
        </p>
        <details className="ui-insights-priority-details mt-1">
          <summary className="text-sm text-muted-light">
            Show priority map
          </summary>
          <p className="mt-2 text-xs text-muted-light">
            Based on importance and urgency labels.
          </p>
          <div className="mt-2">
            <InsightsBarChart rows={rows} />
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Priority</h2>
      <p className="text-xs text-muted-light">
        Based on importance and urgency labels.
      </p>
      <InsightsBarChart rows={rows} />
      {quadrants.unclassified > 0 ? (
        <p className="text-sm text-muted">
          {quadrants.unclassified === 1
            ? "1 item without priority labels."
            : `${quadrants.unclassified} items without priority labels.`}
        </p>
      ) : null}
    </section>
  );
}
