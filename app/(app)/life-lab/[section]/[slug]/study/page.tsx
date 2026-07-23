import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabFlashcardStudy } from "@/components/life-lab/life-lab-flashcard-study";
import { LifeLabReadingModeProvider } from "@/components/life-lab/life-lab-reading-mode";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { getLifeLabNoteData } from "@/lib/life-lab";
import { enrichFlashcardsWithLearningDictionary } from "@/lib/learning-dictionary/data";
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
  const enrichedCards = await enrichFlashcardsWithLearningDictionary(
    note.flashcards,
  );

  return (
    <section
      className="ui-life-lab-surface ui-page-stack space-y-4"
      data-flashcard-route="deck-detail"
    >
      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <LifeLabReadingModeProvider metadata={note.metadata}>
          <LifeLabFlashcardStudy
            cards={cards}
            enrichedCards={enrichedCards}
            backHref={`/life-lab/${note.sectionId}/${note.slug}`}
            title={note.title}
          />
        </LifeLabReadingModeProvider>
      )}
    </section>
  );
}
