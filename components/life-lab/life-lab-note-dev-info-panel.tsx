import type { LifeLabNoteDevMeta, LifeLabNoteLoadMeta } from "@/lib/life-lab/constants";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";

type LifeLabNoteDevInfoPanelProps = {
  dev: LifeLabNoteDevMeta;
  loadMeta: LifeLabNoteLoadMeta;
};

function formatBytes(size: number | null): string {
  if (size === null) {
    return "Unknown";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LifeLabNoteDevInfoPanel({
  dev,
  loadMeta,
}: LifeLabNoteDevInfoPanelProps) {
  if (!isLifeLabDevToolsEnabled()) {
    return null;
  }

  const rows = [
    { label: "Drive file ID", value: dev.fileId },
    { label: "Relative path", value: dev.relativePath },
    { label: "Parent folder", value: dev.parentFolder ?? "Unknown" },
    {
      label: "Google modified time",
      value: formatTimestamp(dev.modifiedAt),
    },
    {
      label: "Cached",
      value: loadMeta.fromCache ? "Yes" : "No",
    },
    {
      label: "Loaded at",
      value: formatTimestamp(loadMeta.loadedAt),
    },
    { label: "File size", value: formatBytes(dev.fileSizeBytes) },
    { label: "MIME type", value: dev.mimeType ?? "Unknown" },
  ];

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Developer information
      </summary>
      <dl className="ui-settings-details-body">
        {rows.map((row) => (
          <div key={row.label} className="ui-settings-info-row">
            <dt className="text-muted">{row.label}</dt>
            <dd className="max-w-[60%] truncate text-end text-foreground" dir="auto">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
