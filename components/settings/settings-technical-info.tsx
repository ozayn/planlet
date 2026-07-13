type TechnicalInfoRow = {
  label: string;
  value: string;
};

type SettingsTechnicalInfoProps = {
  rows: TechnicalInfoRow[];
  embedded?: boolean;
};

export function SettingsTechnicalInfo({
  rows,
  embedded = false,
}: SettingsTechnicalInfoProps) {
  const content = (
    <dl className={embedded ? "space-y-2" : "ui-settings-details-body"}>
      {rows.map((row) => (
        <div key={row.label} className="ui-settings-info-row">
          <dt className="text-muted">{row.label}</dt>
          <dd className="text-end text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );

  if (embedded) {
    return content;
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">Technical info</summary>
      {content}
    </details>
  );
}
