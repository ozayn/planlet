import Link from "next/link";
import { Archive } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabHomeBrowser } from "@/components/life-lab/life-lab-home-browser";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabSectionCard } from "@/components/life-lab/life-lab-section-card";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import {
  getLifeLabBrowseData,
  getLifeLabFlashcardSummary,
  getLifeLabHomeData,
} from "@/lib/life-lab";
import {
  formatSectionContentMeta,
  type ContentCountType,
} from "@/lib/life-lab/collection-metadata";
import { canViewLifeLabTechnicalDebug } from "@/lib/life-lab/dev";
import {
  formatFlashcardSectionMeta,
  type LifeLabFlashcardSummary,
} from "@/lib/life-lab/flashcard-summary";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import {
  excludeArchivedByKey,
  getArchivedLifeLabItemKeySet,
} from "@/lib/life-lab/item-state";
import { lifeLabSectionIconMap } from "@/lib/life-lab/section-icons";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

function contentTypeForSection(sectionId: LifeLabSectionId): ContentCountType {
  if (sectionId === "flashcards") {
    return "deck";
  }

  if (sectionId === "podcasts") {
    return "podcast";
  }

  return "note";
}

function FlashcardSummaryDebug({
  summary,
}: {
  summary: LifeLabFlashcardSummary;
}) {
  return (
    <details className="rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs text-muted">
      <summary className="cursor-pointer font-medium text-muted">
        Debug · Flashcards summary
      </summary>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
        <div>
          Valid decks: {summary.activeDeckCount}
        </div>
        <div>
          Studyable cards: {summary.cardCount}
        </div>
        <div>
          Archived decks: {summary.archivedDeckCount}
        </div>
        <div>
          Empty decks: {summary.emptyDeckCount}
        </div>
        <div>
          Malformed decks: {summary.malformedDeckCount}
        </div>
        <div>
          Unavailable references: {summary.referenceUnavailableCount}
        </div>
        <div>
          Embedded: {summary.embeddedDeckCount}
        </div>
        <div>
          Standalone: {summary.standaloneDeckCount}
        </div>
      </dl>
    </details>
  );
}

export default async function LifeLabPage() {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const archivedKeys = await getArchivedLifeLabItemKeySet(session.user.id);
  const [{ availability, sections }, browseData, flashcardLibrary] =
    await Promise.all([
      getLifeLabHomeData(),
      getLifeLabBrowseData(),
      getLifeLabFlashcardSummary(archivedKeys),
    ]);
  const isAdmin = isAdminRole(session.user.role);
  const showFlashcardDebug = canViewLifeLabTechnicalDebug(isAdmin);
  const flashcardSummary = flashcardLibrary.summary;
  const visibleBrowseNotes = excludeArchivedByKey(
    browseData.notes,
    archivedKeys,
    (note) =>
      buildNoteItemKey({
        sectionId: note.sectionId,
        relativePath: note.relativePath,
        slug: note.slug,
      }),
  );

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader
        title="Life Lab"
        subtitle="Learning notes from selected Life Lab folders."
        action={
          availability.status === "ready" ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/life-lab/archived"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground"
                aria-label="Archived items"
              >
                <Archive className="size-3.5 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Archived</span>
              </Link>
              <LifeLabRefreshButton scope="home" compact />
            </div>
          ) : null
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <LifeLabHomeBrowser notes={visibleBrowseNotes} />

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted">Sections</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
              {sections.map((section) => {
                const Icon = lifeLabSectionIconMap[section.id];
                const isFlashcards = section.id === "flashcards";
                const meta = isFlashcards
                  ? formatFlashcardSectionMeta(flashcardSummary)
                  : formatSectionContentMeta(
                      section.noteCount,
                      contentTypeForSection(section.id),
                    );
                const isEmpty = isFlashcards
                  ? flashcardSummary.activeDeckCount <= 0
                  : section.noteCount <= 0;

                return (
                  <LifeLabSectionCard
                    key={section.id}
                    title={section.label}
                    href={`/life-lab/${section.id}`}
                    icon={Icon}
                    meta={meta}
                    isEmpty={isEmpty}
                    secondaryAction={
                      isFlashcards && flashcardSummary.cardCount > 0
                        ? {
                            href: "/life-lab/study",
                            label: "Study all",
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>

          {showFlashcardDebug ? (
            <FlashcardSummaryDebug summary={flashcardSummary} />
          ) : null}
        </>
      )}
    </section>
  );
}
