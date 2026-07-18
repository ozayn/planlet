import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { auditLifeLabNoteQuality } from "@/lib/life-lab/note-quality";

type LifeLabNoteQualityPanelProps = {
  content: string;
  title: string;
  metadata?: LifeLabNoteMetadata;
};

export function LifeLabNoteQualityPanel({
  content,
  title,
  metadata,
}: LifeLabNoteQualityPanelProps) {
  const issues = auditLifeLabNoteQuality({ content, title, metadata });

  if (issues.length === 0) {
    return null;
  }

  return (
    <details className="ui-settings-details group print:hidden">
      <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
        <span className="font-medium text-muted">
          Note quality · {issues.length}{" "}
          {issues.length === 1 ? "issue" : "issues"}
        </span>
      </summary>
      <ul className="ui-settings-details-body list-disc space-y-1.5 ps-5 text-sm text-muted">
        {issues.map((issue, index) => (
          <li key={`${issue.kind}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    </details>
  );
}
