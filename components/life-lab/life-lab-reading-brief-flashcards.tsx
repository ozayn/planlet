import Link from "next/link";

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

  const previewCards = cards.slice(0, 3);

  return (
    <section
      id="flashcards"
      className="scroll-mt-[calc(3.25rem+env(safe-area-inset-top)+2.5rem)] md:scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Flashcards</h2>
          <p className="text-xs text-muted">
            {cards.length} flashcard{cards.length === 1 ? "" : "s"} available
          </p>
        </div>
        <Link
          href={`/life-lab/${sectionId}/${slug}/study`}
          className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
        >
          Study · {cards.length} cards
        </Link>
      </div>

      <ul className="mt-3 hidden space-y-2 md:block">
        {previewCards.map((card, index) => (
          <li
            key={`${index}-${card.question.slice(0, 24)}`}
            className="rounded-xl border border-border/60 bg-surface p-3"
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              Q
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {card.question}
            </p>
          </li>
        ))}
      </ul>

      {cards.length > previewCards.length ? (
        <p className="mt-2 hidden text-xs text-muted md:block">
          +{cards.length - previewCards.length} more in study mode
        </p>
      ) : null}
    </section>
  );
}
