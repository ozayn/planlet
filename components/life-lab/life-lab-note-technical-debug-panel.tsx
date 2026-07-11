import { canViewLifeLabTechnicalDebug } from "@/lib/life-lab/dev";

type LifeLabNoteTechnicalDebugPanelProps = {
  technicalProvenance: string[];
  isAdmin: boolean;
};

export function LifeLabNoteTechnicalDebugPanel({
  technicalProvenance,
  isAdmin,
}: LifeLabNoteTechnicalDebugPanelProps) {
  if (!canViewLifeLabTechnicalDebug(isAdmin) || technicalProvenance.length === 0) {
    return null;
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">Debug</summary>
      <div className="ui-settings-details-body space-y-3">
        <p className="text-xs text-muted">
          Technical provenance hidden from the normal reading view.
        </p>
        <ul className="space-y-2 text-xs text-muted">
          {technicalProvenance.map((entry, index) => (
            <li
              key={`${index}-${entry.slice(0, 24)}`}
              className="rounded-lg border border-border/50 bg-surface px-3 py-2 whitespace-pre-wrap text-foreground/90"
            >
              {entry}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
