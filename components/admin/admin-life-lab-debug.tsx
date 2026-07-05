type AdminLifeLabDebugProps = {
  signedInEmail: string | null | undefined;
  isAdmin: boolean;
  canUseLifeLabFeatures: boolean;
  lifeLabEmails: string[];
};

export function AdminLifeLabDebug({
  signedInEmail,
  isAdmin,
  canUseLifeLabFeatures,
  lifeLabEmails,
}: AdminLifeLabDebugProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const rows = [
    { label: "Signed-in email", value: signedInEmail ?? "None" },
    { label: "isAdmin", value: isAdmin ? "true" : "false" },
    {
      label: "canUseLifeLabFeatures",
      value: canUseLifeLabFeatures ? "true" : "false",
    },
    {
      label: "LIFE_LAB_EMAILS",
      value:
        lifeLabEmails.length > 0
          ? lifeLabEmails.join(", ")
          : "None configured",
    },
  ];

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Life Lab debug (dev only)
      </summary>
      <dl className="ui-settings-details-body">
        {rows.map((row) => (
          <div key={row.label} className="ui-settings-info-row">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-end text-foreground" dir="auto">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
