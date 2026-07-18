"use client";

import { useState } from "react";

import { LIFE_LAB_UI_LABELS } from "@/lib/life-lab/ui-labels";

type LifeLabNoteTechnicalDebugPanelProps = {
  technicalProvenance: string[];
  developerMode: boolean;
};

function TechnicalEntries({ entries }: { entries: string[] }) {
  return (
    <ul className="space-y-2 text-xs text-muted">
      {entries.map((entry, index) => (
        <li
          key={`${index}-${entry.slice(0, 24)}`}
          className="rounded-lg border border-border/50 bg-surface px-3 py-2 whitespace-pre-wrap text-foreground/90"
        >
          {entry}
        </li>
      ))}
    </ul>
  );
}

export function LifeLabNoteTechnicalDebugPanel({
  technicalProvenance,
  developerMode,
}: LifeLabNoteTechnicalDebugPanelProps) {
  const [explicitlyShown, setExplicitlyShown] = useState(false);

  if (technicalProvenance.length === 0) {
    return null;
  }

  if (!developerMode && !explicitlyShown) {
    return (
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => setExplicitlyShown(true)}
          className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          {LIFE_LAB_UI_LABELS.showTechnicalDetails}
        </button>
      </div>
    );
  }

  return (
    <>
      <details className="ui-settings-details group print:hidden">
        <summary className="ui-settings-details-summary">
          {LIFE_LAB_UI_LABELS.technicalDetails}
        </summary>
        <div className="ui-settings-details-body space-y-3">
          <p className="text-xs text-muted">
            Processing and provenance information.
          </p>
          <TechnicalEntries entries={technicalProvenance} />
        </div>
      </details>
      {developerMode ? (
        <section className="hidden space-y-3 print:block">
          <h2 className="text-base font-semibold">
            {LIFE_LAB_UI_LABELS.technicalDetails}
          </h2>
          <TechnicalEntries entries={technicalProvenance} />
        </section>
      ) : null}
    </>
  );
}
