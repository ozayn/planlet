import Link from "next/link";

import { LifeLabFlashcardList } from "@/components/life-lab/life-lab-flashcard-list";
import type { LifeLabFlashcard, LifeLabSectionId } from "@/lib/life-lab/constants";

type LifeLabReadingBriefFlashcardsProps = {
  sectionId: LifeLabSectionId;
  slug: string;
  cards: LifeLabFlashcard[];
};

export function LifeLabReadingBriefFlashcards({
  sectionId,
  slug,
  cards,
}: LifeLabReadingBriefFlashcardsProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="scroll-mt-[calc(3.25rem+env(safe-area-inset-top)+2.5rem)] md:scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {cards.length} flashcard{cards.length === 1 ? "" : "s"} available
        </p>
        <Link
          href={`/life-lab/${sectionId}/${slug}/study`}
          className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
        >
          Study · {cards.length} cards
        </Link>
      </div>

      <LifeLabFlashcardList cards={cards} showTitle={false} />
    </section>
  );
}
