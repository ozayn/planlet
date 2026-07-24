import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { FlashcardsPageContent } from "@/components/life-lab/flashcards-page-content";
import { LifeLabLearningDictionaryPage } from "@/components/life-lab/life-lab-learning-dictionary-page";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabSectionBrowser } from "@/components/life-lab/life-lab-section-browser";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import {
  getLifeLabFlashcardSummary,
  getLifeLabSectionData,
} from "@/lib/life-lab";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { canViewLifeLabCacheDiagnostics } from "@/lib/life-lab/cache-telemetry";
import { formatContentCount } from "@/lib/life-lab/collection-metadata";
import { formatFlashcardSectionMeta } from "@/lib/life-lab/flashcard-summary";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import {
  excludeArchivedByKey,
  getArchivedLifeLabItemKeySet,
  getLifeLabStudyStatusMap,
} from "@/lib/life-lab/item-state";
import type { DictionaryLearnItem } from "@/lib/learning-dictionary/learn-session";
import {
  collectDictionaryBrowseCards,
  DEFAULT_DICTIONARY_BROWSE_FILTERS,
  LEARNING_DICTIONARY_SECTION_ID,
  lifeLabDictionaryNoteHref,
} from "@/lib/learning-dictionary/model";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ refresh?: string; view?: string }>;
};

function toLifeLabLearnItems(
  cards: ReturnType<typeof collectDictionaryBrowseCards>,
): DictionaryLearnItem[] {
  return cards.map((card) => ({
    itemKey: card.itemKey,
    slug: card.slug,
    title: card.title,
    definition: card.definition,
    href: lifeLabDictionaryNoteHref(card.slug),
    thumbnailUrl: card.thumbnailUrl,
    studyStatus: card.reviewStatus,
    languageId: card.languageId,
  }));
}

export default async function LifeLabSectionPage({
  params,
  searchParams,
}: LifeLabSectionPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section } = await params;
  const { refresh, view } = await searchParams;
  const isAdmin = isAdminRole(session.user.role);
  const isAuthorized = canAccessLifeLabPage(session.user);
  const shouldRefresh = canUseLifeLabRefreshBypass(refresh, isAuthorized);
  const showDiagnostics = canViewLifeLabCacheDiagnostics(isAdmin);

  if (section === "flashcards") {
    const archivedKeys = await getArchivedLifeLabItemKeySet(session.user.id);
    const { availability, decks, summary } =
      await getLifeLabFlashcardSummary(archivedKeys);

    return (
      <section className="ui-life-lab-surface ui-page-stack space-y-4">
        <PageHeader
          title="Flashcards"
          subtitle={formatFlashcardSectionMeta(summary)}
          action={
            <div className="flex items-center gap-3">
              <Link
                href="/life-lab/archived"
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                Archived
              </Link>
              <Link
                href="/life-lab"
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                Back to Life Lab
              </Link>
              <LifeLabRefreshButton
                scope="section"
                sectionId="flashcards"
                compact
              />
            </div>
          }
        />

        {availability.status !== "ready" ? (
          <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
        ) : (
          <>
            {summary.cardCount > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/life-lab/study"
                  className="inline-flex min-h-9 items-center rounded-lg border border-border/70 px-3 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground"
                >
                  Study all · {formatContentCount(summary.cardCount, "card")}
                </Link>
              </div>
            ) : null}
            <FlashcardsPageContent
              decks={decks}
              archivedItemKeys={[...archivedKeys]}
            />
          </>
        )}
      </section>
    );
  }

  if (section === "learning-dictionary") {
    const activeView = view === "learn" ? "learn" : "browse";
    const [
      { availability, notes, filterOptions, listingDiagnostic },
      archivedKeys,
      studyStatusMap,
    ] = await Promise.all([
      getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID, {
        refresh: shouldRefresh,
        includeListingDiagnostic: showDiagnostics,
      }),
      getArchivedLifeLabItemKeySet(session.user.id),
      getLifeLabStudyStatusMap(session.user.id, {
        section: LEARNING_DICTIONARY_SECTION_ID,
      }),
    ]);

    const visibleNotes = excludeArchivedByKey(
      notes,
      archivedKeys,
      (note) =>
        buildNoteItemKey({
          sectionId: LEARNING_DICTIONARY_SECTION_ID,
          relativePath: note.relativePath,
          slug: note.slug,
        }),
    );

    const learnItems = toLifeLabLearnItems(
      collectDictionaryBrowseCards(
        visibleNotes,
        DEFAULT_DICTIONARY_BROWSE_FILTERS,
        studyStatusMap,
      ),
    );

    return (
      <LifeLabLearningDictionaryPage
        availability={availability}
        notes={notes}
        filterOptions={filterOptions}
        listingDiagnostic={listingDiagnostic}
        showDiagnostics={showDiagnostics}
        archivedItemKeys={[...archivedKeys]}
        learnItems={learnItems}
        activeView={activeView}
        isAdmin={isAdmin}
      />
    );
  }

  const [{ availability, sectionId, sectionLabel, notes, filterOptions, listingDiagnostic }, archivedKeys] =
    await Promise.all([
      getLifeLabSectionData(section, {
        refresh: shouldRefresh,
        includeListingDiagnostic: showDiagnostics,
      }),
      getArchivedLifeLabItemKeySet(session.user.id),
    ]);

  if (!sectionId || !sectionLabel) {
    notFound();
  }

  const noteCount = notes.length;
  const isReadingBriefs = sectionId === "reading-briefs";
  const isPodcasts = sectionId === "podcasts";

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader
        title={sectionLabel}
        subtitle={
          isReadingBriefs
            ? "A personal reading and news archive."
            : isPodcasts
              ? "Podcast series and processed episode notes."
              : "Notes from this Life Lab folder."
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
              sectionId={sectionId}
              compact
            />
          </div>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : noteCount === 0 ? (
        <LifeLabStatusPanel
          availability={availability}
          isAdmin={isAdmin}
          emptyMessage={
            isReadingBriefs
              ? "No Reading Briefs yet."
              : isPodcasts
                ? "No podcast episodes have been processed yet."
                : "No notes in this section yet."
          }
        />
      ) : (
        <LifeLabSectionBrowser
          sectionId={sectionId}
          notes={notes}
          filterOptions={filterOptions}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          archivedItemKeys={[...archivedKeys]}
        />
      )}
    </section>
  );
}
