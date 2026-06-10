type IntentionEntry = {
  title: string;
  count: number;
};

type InsightsIntentionsProps = {
  repeated: IntentionEntry[];
  singles: IntentionEntry[];
};

function IntentionList({ items }: { items: IntentionEntry[] }) {
  return (
    <ul className="ui-insights-intention-list">
      {items.map((intention) => (
        <li key={intention.title} className="ui-insights-intention-row">
          <span className="min-w-0 truncate text-sm text-foreground" dir="auto">
            {intention.title}
          </span>
          {intention.count > 1 ? (
            <span className="shrink-0 text-sm tabular-nums text-muted-light">
              {intention.count}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function InsightsIntentions({
  repeated,
  singles,
}: InsightsIntentionsProps) {
  if (repeated.length === 0 && singles.length === 0) {
    return null;
  }

  return (
    <div className="ui-insights-section space-y-3">
      {repeated.length > 0 ? (
        <section>
          <h2 className="ui-insights-section-title">Repeated intentions</h2>
          <IntentionList items={repeated} />
        </section>
      ) : null}

      {singles.length > 0 ? (
        <section>
          <h2 className="ui-insights-section-title">Intentions</h2>
          <IntentionList items={singles} />
        </section>
      ) : null}
    </div>
  );
}
