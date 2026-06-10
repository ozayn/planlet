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

function QuadrantRows({
  quadrants,
}: {
  quadrants: MonthlyInsights["priorityQuadrants"];
}) {
  return (
    <ul className="ui-insights-breakdown-list mt-2">
      {QUADRANTS.map((quadrant) => (
        <li key={quadrant.key} className="ui-insights-breakdown-row">
          <span className="text-foreground">{quadrant.title}</span>
          <span className="tabular-nums text-muted">
            {quadrants[quadrant.key]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function unclassifiedLabel(count: number): string {
  if (count === 0) {
    return "No items were labeled by importance or urgency.";
  }

  if (count === 1) {
    return "1 item was not labeled by importance or urgency.";
  }

  return `${count} items were not labeled by importance or urgency.`;
}

export function PriorityMatrix({ quadrants }: PriorityMatrixProps) {
  const classified =
    quadrants.doSoon +
    quadrants.protectTime +
    quadrants.contain +
    quadrants.maybeRelease;

  if (classified === 0) {
    return (
      <section className="ui-insights-section">
        <h2 className="ui-insights-section-title">Priority</h2>
        <p className="text-sm text-muted">
          {unclassifiedLabel(quadrants.unclassified)}
        </p>
        <details className="ui-insights-priority-details mt-2">
          <summary className="text-sm text-muted-light">
            Show priority map
          </summary>
          <p className="mt-2 text-xs text-muted-light">
            Based on importance and urgency labels.
          </p>
          <QuadrantRows quadrants={quadrants} />
        </details>
      </section>
    );
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-section-title">Priority</h2>
      <p className="text-xs text-muted-light">
        Based on importance and urgency labels.
      </p>
      <div className="ui-insights-breakdown mt-2 rounded-lg border border-border-soft/80 bg-surface/60 px-3 py-2.5">
        <QuadrantRows quadrants={quadrants} />
      </div>
      {quadrants.unclassified > 0 ? (
        <p className="mt-2 text-sm text-muted">
          {unclassifiedLabel(quadrants.unclassified)}
        </p>
      ) : null}
    </section>
  );
}
