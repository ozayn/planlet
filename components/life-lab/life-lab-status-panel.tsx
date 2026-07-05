import type {
  LifeLabAvailability,
  LifeLabDiagnostic,
} from "@/lib/life-lab/constants";

type LifeLabStatusPanelProps = {
  availability: LifeLabAvailability;
  isAdmin: boolean;
  emptyMessage?: string;
};

function formatDiagnosticValue(value: boolean): string {
  return value ? "Yes" : "No";
}

function LifeLabDiagnosticDetails({
  diagnostic,
}: {
  diagnostic: LifeLabDiagnostic;
}) {
  const rows = [
    {
      label: "Drive credentials present",
      value: formatDiagnosticValue(diagnostic.driveCredentialsPresent),
    },
    {
      label: "Root folder id present",
      value: formatDiagnosticValue(diagnostic.rootFolderIdPresent),
    },
    {
      label: "Folder map loaded",
      value: formatDiagnosticValue(diagnostic.folderMapLoaded),
    },
    {
      label: "Error",
      value: diagnostic.errorMessage
        ? `${diagnostic.errorName ?? "Error"}: ${diagnostic.errorMessage}`
        : "None",
    },
  ];

  return (
    <dl className="mt-3 space-y-2 border-t border-border-soft pt-3 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="ui-settings-info-row">
          <dt className="text-muted">{row.label}</dt>
          <dd className="text-end text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LifeLabStatusPanel({
  availability,
  isAdmin,
  emptyMessage,
}: LifeLabStatusPanelProps) {
  if (availability.status === "unconfigured") {
    return (
      <div className="ui-card-padded">
        <p className="text-sm text-muted">
          {isAdmin
            ? availability.adminMessage
            : "Life Lab is unavailable right now."}
        </p>
        {isAdmin ? (
          <>
            <p className="mt-2 text-xs text-muted-light">
              Required: GOOGLE_SERVICE_ACCOUNT_EMAIL,
              GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, LIFE_LAB_DRIVE_FOLDER_ID
            </p>
            <LifeLabDiagnosticDetails diagnostic={availability.diagnostic} />
          </>
        ) : null}
      </div>
    );
  }

  if (availability.status === "unavailable") {
    return (
      <div className="ui-card-padded">
        <p className="text-sm text-muted">{availability.message}</p>
        {isAdmin ? (
          <LifeLabDiagnosticDetails diagnostic={availability.diagnostic} />
        ) : null}
      </div>
    );
  }

  if (emptyMessage) {
    return (
      <div className="ui-card-padded">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return null;
}
