import { Suspense } from "react";
import Link from "next/link";

import { DictionaryLearnView } from "@/components/learning-dictionary/dictionary-learn-view";
import { DictionaryModeTabs } from "@/components/learning-dictionary/dictionary-mode-tabs";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabSectionBrowser } from "@/components/life-lab/life-lab-section-browser";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import type {
  LifeLabAvailability,
  LifeLabListingDiagnostic,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import type { LifeLabFilterOptions } from "@/lib/life-lab/filters";
import type { DictionaryLearnItem } from "@/lib/learning-dictionary/learn-session";
import { LEARNING_DICTIONARY_SECTION_ID } from "@/lib/learning-dictionary/model";

export type LifeLabLearningDictionaryPageProps = {
  availability: LifeLabAvailability;
  notes: LifeLabNoteSummary[];
  filterOptions: LifeLabFilterOptions;
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  archivedItemKeys: string[];
  learnItems: DictionaryLearnItem[];
  activeView: "browse" | "learn";
  isAdmin: boolean;
};

/**
 * Dedicated Learning Dictionary surface for /life-lab/learning-dictionary.
 * Owns Browse (existing list) and Learn (one-card Explore-style study).
 */
export function LifeLabLearningDictionaryPage({
  availability,
  notes,
  filterOptions,
  listingDiagnostic,
  showDiagnostics,
  archivedItemKeys,
  learnItems,
  activeView,
  isAdmin,
}: LifeLabLearningDictionaryPageProps) {
  const noteCount = notes.length;

  return (
    <section
      className="ui-life-lab-surface ui-page-stack space-y-5"
      data-learning-dictionary-view={activeView}
      data-life-lab-learning-dictionary-page=""
    >
      <PageHeader
        title="Learning Dictionary"
        subtitle={
          activeView === "learn"
            ? undefined
            : "Reusable phrases, concepts, and names."
        }
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/life-lab"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Back to Life Lab
            </Link>
            <LifeLabRefreshButton
              scope="section"
              sectionId={LEARNING_DICTIONARY_SECTION_ID}
              compact
            />
          </div>
        }
      />

      <Suspense
        fallback={
          <div className="inline-flex min-h-9 rounded-xl border border-border/70 bg-surface px-3 text-sm text-muted">
            Browse
          </div>
        }
      >
        <DictionaryModeTabs active={activeView} />
      </Suspense>

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : activeView === "learn" ? (
        <DictionaryLearnView
          items={learnItems}
          browseHref="/life-lab/learning-dictionary"
        />
      ) : noteCount === 0 ? (
        <LifeLabStatusPanel
          availability={availability}
          isAdmin={isAdmin}
          emptyMessage="No Learning Dictionary entries yet."
        />
      ) : (
        <LifeLabSectionBrowser
          sectionId={LEARNING_DICTIONARY_SECTION_ID}
          notes={notes}
          filterOptions={filterOptions}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          archivedItemKeys={archivedItemKeys}
        />
      )}
    </section>
  );
}
