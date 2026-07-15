"use client";

import { LearningDictionarySection } from "@/components/life-lab/learning-dictionary-section";
import type {
  LifeLabListingDiagnostic,
  LifeLabNoteGroup,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  learningDictionaryLayoutMarker,
  orderLearningDictionaryGroups,
  shouldRenderLearningDictionaryDiagnostics,
} from "@/lib/life-lab/learning-dictionary-layout";

type LearningDictionaryPageContentProps = {
  sectionId: LifeLabSectionId;
  groups: LifeLabNoteGroup[];
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
};

function DictionaryListingDiagnosticPanel({
  diagnostic,
}: {
  diagnostic: LifeLabListingDiagnostic;
}) {
  const rows = [
    { label: "Files found", value: String(diagnostic.fileCount) },
    { label: "Folders traversed", value: String(diagnostic.foldersTraversed) },
    { label: "Max depth used", value: String(diagnostic.maxDepthUsed) },
    {
      label: "Pagination occurred",
      value: diagnostic.paginationOccurred ? "Yes" : "No",
    },
  ];

  if (diagnostic.cache) {
    rows.push(
      {
        label: "Cache hit",
        value: diagnostic.cache.fromCache ? "Yes" : "No",
      },
      { label: "Cache key", value: diagnostic.cache.cacheKey },
      {
        label: "Drive API calls",
        value: String(diagnostic.cache.driveCalls ?? 0),
      },
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
        <span className="font-medium text-muted">Debug</span>
      </summary>
      <div className="ui-settings-details-body space-y-2">
        <dl className="space-y-1.5 text-xs text-muted">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt>{row.label}</dt>
              <dd className="text-right text-foreground/80 [overflow-wrap:anywhere]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

/**
 * Dedicated Learning Dictionary browse surface for
 * /life-lab/learning-dictionary — not the generic Life Lab card list.
 */
export function LearningDictionaryPageContent({
  sectionId,
  groups,
  listingDiagnostic,
  showDiagnostics,
}: LearningDictionaryPageContentProps) {
  const orderedGroups = orderLearningDictionaryGroups(groups);
  const showDebug = shouldRenderLearningDictionaryDiagnostics(
    listingDiagnostic,
    showDiagnostics,
  );

  return (
    <div className="space-y-6" {...learningDictionaryLayoutMarker()}>
      {orderedGroups.map((group) => (
        <LearningDictionarySection
          key={group.id}
          sectionId={sectionId}
          group={group}
        />
      ))}

      {showDebug && listingDiagnostic ? (
        <DictionaryListingDiagnosticPanel diagnostic={listingDiagnostic} />
      ) : null}
    </div>
  );
}
