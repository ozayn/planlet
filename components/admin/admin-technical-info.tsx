type AdminTechnicalInfoProps = {
  allowedEmails: string[];
  adminEmails: string[];
  reflectorEmails: string[];
  feedbackEmails: string[];
  aiParsing: string;
  audioTranscription: string;
  imageExtraction: string;
  pushNotifications: string;
};

function formatEmailList(emails: string[]): string {
  if (emails.length === 0) {
    return "None configured";
  }

  return `${emails.length} configured`;
}

export function AdminTechnicalInfo({
  allowedEmails,
  adminEmails,
  reflectorEmails,
  feedbackEmails,
  aiParsing,
  audioTranscription,
  imageExtraction,
  pushNotifications,
}: AdminTechnicalInfoProps) {
  const rows = [
    {
      label: "Allowed emails",
      value:
        allowedEmails.length > 0
          ? formatEmailList(allowedEmails)
          : "Open (all Google sign-ins)",
    },
    { label: "Admin emails", value: formatEmailList(adminEmails) },
    { label: "Reflection emails", value: formatEmailList(reflectorEmails) },
    { label: "Feedback emails", value: formatEmailList(feedbackEmails) },
    { label: "AI parsing", value: aiParsing },
    { label: "Audio transcription", value: audioTranscription },
    { label: "Image extraction", value: imageExtraction },
    { label: "Push notifications", value: pushNotifications },
  ];

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">Technical info</summary>
      <dl className="ui-settings-details-body">
        {rows.map((row) => (
          <div key={row.label} className="ui-settings-info-row">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-end text-foreground">{row.value}</dd>
          </div>
        ))}
        {allowedEmails.length > 0 ? (
          <div className="border-t border-border-soft pt-2">
            <p className="text-xs text-muted-light">Allowed</p>
            <ul className="mt-1 space-y-0.5 text-xs text-foreground">
              {allowedEmails.map((email) => (
                <li key={email} dir="auto">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {adminEmails.length > 0 ? (
          <div className="border-t border-border-soft pt-2">
            <p className="text-xs text-muted-light">Admin</p>
            <ul className="mt-1 space-y-0.5 text-xs text-foreground">
              {adminEmails.map((email) => (
                <li key={email} dir="auto">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {reflectorEmails.length > 0 ? (
          <div className="border-t border-border-soft pt-2">
            <p className="text-xs text-muted-light">Reflection</p>
            <ul className="mt-1 space-y-0.5 text-xs text-foreground">
              {reflectorEmails.map((email) => (
                <li key={email} dir="auto">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {feedbackEmails.length > 0 ? (
          <div className="border-t border-border-soft pt-2">
            <p className="text-xs text-muted-light">Feedback</p>
            <ul className="mt-1 space-y-0.5 text-xs text-foreground">
              {feedbackEmails.map((email) => (
                <li key={email} dir="auto">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </dl>
    </details>
  );
}
