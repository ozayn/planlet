import Link from "next/link";
import { Archive } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabHomeBrowser } from "@/components/life-lab/life-lab-home-browser";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabSectionCard } from "@/components/life-lab/life-lab-section-card";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabBrowseData, getLifeLabHomeData } from "@/lib/life-lab";
import { collapseNotesByTranslationGroup } from "@/lib/life-lab/bilingual";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import {
  excludeArchivedByKey,
  getArchivedLifeLabItemKeySet,
} from "@/lib/life-lab/item-state";
import {
  countBrowseNotesBySection,
  homeSectionCardMeta,
} from "@/lib/life-lab/section-counts";
import { lifeLabSectionIconMap } from "@/lib/life-lab/section-icons";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

export default async function LifeLabPage() {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const archivedKeys = await getArchivedLifeLabItemKeySet(session.user.id);
  const [{ availability, sections }, browseData] = await Promise.all([
    getLifeLabHomeData(),
    getLifeLabBrowseData(),
  ]);
  const isAdmin = isAdminRole(session.user.role);
  const visibleBrowseNotes = excludeArchivedByKey(
    browseData.notes,
    archivedKeys,
    (note) =>
      buildNoteItemKey({
        sectionId: note.sectionId,
        relativePath: note.relativePath,
        slug: note.slug,
        metadata: note.metadata,
      }),
  );
  const dedupedBrowseNotes = collapseNotesByTranslationGroup(visibleBrowseNotes);
  // Counts only when browse already loaded the same notes (no extra Drive/parsing).
  const browseCounts =
    availability.status === "ready"
      ? countBrowseNotesBySection(dedupedBrowseNotes)
      : null;

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
                const meta = homeSectionCardMeta({
                  sectionId: section.id,
                  browseCounts,
                });
                const isEmpty =
                  section.id !== "flashcards" &&
                  browseCounts != null &&
                  (browseCounts.get(section.id) ?? 0) <= 0;

                return (
                  <LifeLabSectionCard
                    key={section.id}
                    title={section.label}
                    href={`/life-lab/${section.id}`}
                    icon={Icon}
                    meta={meta}
                    isEmpty={isEmpty}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
