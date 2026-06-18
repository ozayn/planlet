type IntentionEntry = {
  title: string;
  count: number;
};

type InsightsIntentionsProps = {
  intentions: IntentionEntry[];
};

export function InsightsIntentions({ intentions }: InsightsIntentionsProps) {
  if (intentions.length === 0) {
    return null;
  }

  return (
    <div className="ui-insights-subsection">
      <h3 className="ui-insights-subheading">Primary intentions</h3>
      <ul className="ui-insights-bullet-list">
        {intentions.map((intention) => (
          <li key={intention.title} className="ui-insights-bullet-item" dir="auto">
            {intention.title}
            {intention.count > 1 ? (
              <span className="text-muted-light"> · {intention.count}×</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
