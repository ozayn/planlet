import type { LifeLabFlashcard } from "@/lib/life-lab/constants";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type LifeLabFlashcardListProps = {
  cards: LifeLabFlashcard[];
  title?: string;
  showTitle?: boolean;
};

function FlashcardLine({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className: string;
}) {
  const direction = resolveTextDirection(text);

  return (
    <p className={className} dir={direction} lang={textDirectionLang(direction)}>
      <strong dir="ltr">{label}</strong> {text}
    </p>
  );
}

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
            <FlashcardLine
              label="Q:"
              text={card.question}
              className="ui-life-lab-question"
            />
            <FlashcardLine
              label="A:"
              text={card.answer}
              className="ui-life-lab-answer"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
