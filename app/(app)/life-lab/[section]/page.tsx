import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { FlashcardsPageContent } from "@/components/life-lab/flashcards-page-content";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabSectionBrowser } from "@/components/life-lab/life-lab-section-browser";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import {
  getLifeLabFlashcardDecksData,
  getLifeLabSectionData,
} from "@/lib/life-lab";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { canViewLifeLabCacheDiagnostics } from "@/lib/life-lab/cache-telemetry";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export default async function LifeLabSectionPage({
  params,
  searchParams,
}: LifeLabSectionPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section } = await params;
  const { refresh } = await searchParams;
  const isAdmin = isAdminRole(session.user.role);
  const isAuthorized = canAccessLifeLabPage(session.user);
  const shouldRefresh = canUseLifeLabRefreshBypass(refresh, isAuthorized);
  const showDiagnostics = canViewLifeLabCacheDiagnostics(isAdmin);

  if (section === "flashcards") {
    const { availability, decks } = await getLifeLabFlashcardDecksData();

    return (
      <section className="ui-life-lab-surface ui-page-stack space-y-4">
        <PageHeader
          title="Flashcards"
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
                sectionId="flashcards"
                compact
              />
            </div>
          }
        />

        {availability.status !== "ready" ? (
          <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
        ) : (
          <FlashcardsPageContent decks={decks} />
        )}
      </section>
    );
  }

  const { availability, sectionId, sectionLabel, notes, filterOptions, listingDiagnostic } =
    await getLifeLabSectionData(section, {
      refresh: shouldRefresh,
      includeListingDiagnostic: showDiagnostics,
    });

  if (!sectionId || !sectionLabel) {
    notFound();
  }

  const noteCount = notes.length;
  const isLearningDictionary = sectionId === "learning-dictionary";
  const isReadingBriefs = sectionId === "reading-briefs";
  const isPodcasts = sectionId === "podcasts";

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader
        title={sectionLabel}
        subtitle={
          isLearningDictionary
            ? "Reusable phrases, concepts, and names."
            : isReadingBriefs
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
            isLearningDictionary
              ? "No Learning Dictionary entries yet."
              : isReadingBriefs
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
        />
      )}
    </section>
  );
}
