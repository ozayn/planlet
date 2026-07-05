type AdminIdeasDebugProps = {
  signedInEmail: string | null | undefined;
  isAdmin: boolean;
  canUseIdeasFeatures: boolean;
  ideasEmails: string[];
};

export function AdminIdeasDebug({
  signedInEmail,
  isAdmin,
  canUseIdeasFeatures,
  ideasEmails,
}: AdminIdeasDebugProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const rows = [
    { label: "Signed-in email", value: signedInEmail ?? "None" },
    { label: "isAdmin", value: isAdmin ? "true" : "false" },
    {
      label: "canUseIdeasFeatures",
      value: canUseIdeasFeatures ? "true" : "false",
    },
    {
      label: "IDEAS_EMAILS",
      value:
        ideasEmails.length > 0 ? ideasEmails.join(", ") : "None configured",
    },
  ];

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Ideas debug (dev only)
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
