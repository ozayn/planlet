type InsightsStatGridProps = {
  stats: Array<{
    label: string;
    value: string | number;
    hint?: string;
  }>;
};

export function InsightsStatGrid({ stats }: InsightsStatGridProps) {
  return (
    <dl className="ui-insights-stat-grid grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="ui-insights-stat-tile rounded-lg border border-border-soft/80 bg-surface/60 px-3 py-2.5">
          <dt className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
            {stat.label}
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {stat.value}
          </dd>
          {stat.hint ? (
            <dd className="mt-0.5 text-[0.6875rem] leading-snug text-muted-light">
              {stat.hint}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
