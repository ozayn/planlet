import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { DictionaryLearnView } from "@/components/learning-dictionary/dictionary-learn-view";
import { DictionaryModeTabs } from "@/components/learning-dictionary/dictionary-mode-tabs";
import { LearningDictionaryBrowser } from "@/components/learning-dictionary/learning-dictionary-browser";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { isAdminRole } from "@/lib/auth-roles";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { getLifeLabSectionData } from "@/lib/life-lab";
import {
  excludeArchivedByKey,
  getArchivedLifeLabItemKeySet,
  getLifeLabStudyStatusMap,
} from "@/lib/life-lab/item-state";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import { getLearningDictionaryBrowseData } from "@/lib/learning-dictionary/data";
import type { DictionaryLearnItem } from "@/lib/learning-dictionary/learn-session";
import {
  collectDictionaryBrowseCards,
  DEFAULT_DICTIONARY_BROWSE_FILTERS,
  LEARNING_DICTIONARY_SECTION_ID,
} from "@/lib/learning-dictionary/model";
import { canAccessLifeLabPage } from "@/lib/roles";

type LearningDictionaryPageProps = {
  searchParams: Promise<{ refresh?: string; view?: string }>;
};

function toLearnItems(
  cards: ReturnType<typeof collectDictionaryBrowseCards>,
): DictionaryLearnItem[] {
  return cards.map((card) => ({
    itemKey: card.itemKey,
    slug: card.slug,
    title: card.title,
    definition: card.definition,
    href: card.href,
    thumbnailUrl: card.thumbnailUrl,
    studyStatus: card.reviewStatus,
    languageId: card.languageId,
  }));
}

export default async function LearningDictionaryPage({
  searchParams,
}: LearningDictionaryPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { refresh, view } = await searchParams;
  const isAdmin = isAdminRole(session.user.role);
  const shouldRefresh = canUseLifeLabRefreshBypass(
    refresh,
    canAccessLifeLabPage(session.user),
  );
  const activeView = view === "learn" ? "learn" : "browse";

  if (shouldRefresh) {
    await getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID, {
      refresh: true,
    });
  }

  const [browseData, archivedKeys, studyStatusMap] = await Promise.all([
    getLearningDictionaryBrowseData(),
    getArchivedLifeLabItemKeySet(session.user.id),
    getLifeLabStudyStatusMap(session.user.id, {
      section: LEARNING_DICTIONARY_SECTION_ID,
    }),
  ]);

  const visibleNotes = excludeArchivedByKey(
    browseData.notes,
    archivedKeys,
    (note) =>
      buildNoteItemKey({
        sectionId: LEARNING_DICTIONARY_SECTION_ID,
        relativePath: note.relativePath,
        slug: note.slug,
      }),
  );

  const studyStatusByKey = Object.fromEntries(studyStatusMap.entries());
  const allCards = collectDictionaryBrowseCards(
    visibleNotes,
    DEFAULT_DICTIONARY_BROWSE_FILTERS,
    studyStatusMap,
  );

  const learnItems = toLearnItems(allCards);

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-5">
      <PageHeader
        title="Learning Dictionary"
        subtitle={
          activeView === "learn"
            ? undefined
            : "Reusable phrases, concepts, and names from Life Lab."
        }
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/life-lab/learning-dictionary"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Life Lab folder
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

      {browseData.availability.status !== "ready" ? (
        <LifeLabStatusPanel
          availability={browseData.availability}
          isAdmin={isAdmin}
        />
      ) : activeView === "learn" ? (
        <DictionaryLearnView items={learnItems} />
      ) : (
        <LearningDictionaryBrowser
          notes={visibleNotes}
          studyStatusByKey={studyStatusByKey}
        />
      )}
    </section>
  );
}
