type TechnicalInfoRow = {
  label: string;
  value: string;
};

type SettingsTechnicalInfoProps = {
  rows: TechnicalInfoRow[];
};

export function SettingsTechnicalInfo({ rows }: SettingsTechnicalInfoProps) {
  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Technical info
      </summary>
      <dl className="ui-settings-details-body">
        {rows.map((row) => (
          <div key={row.label} className="ui-settings-info-row">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-end text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
