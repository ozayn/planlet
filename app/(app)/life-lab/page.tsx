import Link from "next/link";
import { Layers2, Mic2 } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabHomeBrowser } from "@/components/life-lab/life-lab-home-browser";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabBrowseData, getLifeLabHomeData } from "@/lib/life-lab";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import {
  excludeArchivedByKey,
  getArchivedLifeLabItemKeySet,
} from "@/lib/life-lab/item-state";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

export default async function LifeLabPage() {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const [{ availability, sections }, browseData, archivedKeys] =
    await Promise.all([
      getLifeLabHomeData(),
      getLifeLabBrowseData(),
      getArchivedLifeLabItemKeySet(session.user.id),
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
      }),
  );

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader
        title="Life Lab"
        subtitle="Learning notes from selected Life Lab folders."
        action={
          availability.status === "ready" ? (
            <div className="flex items-center gap-3">
              <Link
                href="/life-lab/archived"
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                Archived
              </Link>
              <LifeLabRefreshButton scope="home" />
            </div>
          ) : null
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <LifeLabHomeBrowser
            notes={visibleBrowseNotes}
            flashcardNoteCount={browseData.flashcardNoteCount}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/life-lab/${section.id}`}
                className="ui-card-padded block transition-colors hover:bg-accent-cream/25"
              >
                <h2 className="text-base font-semibold text-foreground">
                  {section.id === "podcasts" ? (
                    <Mic2
                      className="mr-1.5 inline size-4 align-[-0.125em] text-muted"
                      aria-hidden="true"
                    />
                  ) : null}
                  {section.id === "flashcards" ? (
                    <Layers2
                      className="mr-1.5 inline size-4 align-[-0.125em] text-muted"
                      aria-hidden="true"
                    />
                  ) : null}
                  {section.label}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {section.id === "flashcards"
                    ? section.noteCount === 1
                      ? "1 deck"
                      : `${section.noteCount} decks`
                    : section.noteCount === 1
                      ? "1 note"
                      : `${section.noteCount} notes`}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
