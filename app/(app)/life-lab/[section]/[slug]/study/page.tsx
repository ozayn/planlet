import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabFlashcardStudy } from "@/components/life-lab/life-lab-flashcard-study";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabNoteData } from "@/lib/life-lab";
import type { LifeLabStudyCard } from "@/lib/life-lab/constants";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabNoteStudyPageProps = {
  params: Promise<{ section: string; slug: string }>;
};

export default async function LifeLabNoteStudyPage({
  params,
}: LifeLabNoteStudyPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section, slug } = await params;
  const { availability, note } = await getLifeLabNoteData(section, slug);

  if (!note || !note.flashcards?.length) {
    notFound();
  }

  const isAdmin = isAdminRole(session.user.role);
  const cards: LifeLabStudyCard[] = note.flashcards.map((flashcard) => ({
    ...flashcard,
    noteSlug: note.slug,
    noteTitle: note.title,
    sectionId: note.sectionId,
    sectionLabel: note.sectionLabel,
    playlist: note.metadata?.playlist,
    tags: note.metadata?.tags,
    topics: note.metadata?.topics,
    source: note.metadata?.source,
  }));

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader
        title="Study flashcards"
        subtitle={note.title}
        action={
          <Link
            href={`/life-lab/${note.sectionId}/${note.slug}`}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to note
          </Link>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <LifeLabFlashcardStudy
          cards={cards}
          backHref={`/life-lab/${note.sectionId}/${note.slug}`}
          title={note.title}
          subtitle={`${cards.length} card${cards.length === 1 ? "" : "s"}`}
        />
      )}
    </section>
  );
}
