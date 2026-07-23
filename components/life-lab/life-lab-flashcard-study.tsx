import { FlashcardExplore, type FlashcardExploreDeck } from "@/components/life-lab/flashcard-explore";
import type { LifeLabStudyCard } from "@/lib/life-lab/constants";
import type { FlashcardWithDictionaryLink } from "@/lib/life-lab/flashcard-dictionary-link";

type LifeLabFlashcardStudyProps = {
  cards: LifeLabStudyCard[];
  backHref: string;
  title: string;
  subtitle?: string;
  developerMode?: boolean;
  enrichedCards?: FlashcardWithDictionaryLink[];
};

/** Explore-first flashcard browsing (legacy Study route entry). */
export function LifeLabFlashcardStudy({
  cards,
  backHref,
  title,
  developerMode = false,
  enrichedCards,
}: LifeLabFlashcardStudyProps) {
  const first = cards[0];
  const linkedCards = enrichedCards ?? cards;
  const deck: FlashcardExploreDeck = {
    id: first
      ? `${first.sectionId}__${first.noteSlug}`
      : "empty",
    title,
    cards: linkedCards,
    sourceNoteHref: first
      ? `/life-lab/${first.sectionId}/${first.noteSlug}`
      : null,
    sourceNoteTitle: first?.noteTitle ?? null,
    sourceSectionId: first?.sectionId ?? null,
  };

  return (
    <FlashcardExplore
      deck={deck}
      backHref={backHref}
      developerMode={developerMode}
    />
  );
}
