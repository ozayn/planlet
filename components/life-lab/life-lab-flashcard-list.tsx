import type { LifeLabFlashcard } from "@/lib/life-lab/constants";

type LifeLabFlashcardListProps = {
  cards: LifeLabFlashcard[];
  title?: string;
  showTitle?: boolean;
};

export function LifeLabFlashcardList({
  cards,
  title = "Optional Flashcards",
  showTitle = true,
}: LifeLabFlashcardListProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section id="flashcards" className="scroll-mt-20">
      {showTitle ? (
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      ) : null}

      <div className={showTitle ? "mt-3 space-y-3" : "space-y-3"}>
        {cards.map((card, index) => (
          <div
            key={`${index}-${card.question.slice(0, 24)}`}
            className="ui-life-lab-flashcard"
          >
            <p className="ui-life-lab-question">
              <strong>Q:</strong> {card.question}
            </p>
            <p className="ui-life-lab-answer">
              <strong>A:</strong> {card.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
