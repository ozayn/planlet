"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FlashcardReadAloudControls } from "@/components/life-lab/read-aloud-controls";
import type { LifeLabStudyCard } from "@/lib/life-lab/constants";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type LifeLabFlashcardStudyProps = {
  cards: LifeLabStudyCard[];
  backHref: string;
  title: string;
  subtitle?: string;
};

export function LifeLabFlashcardStudy({
  cards,
  backHref,
  title,
  subtitle,
}: LifeLabFlashcardStudyProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const currentCard = cards[index];
  const total = cards.length;
  const cardText = revealed
    ? (currentCard?.answer ?? "")
    : (currentCard?.question ?? "");
  const cardDirection = resolveTextDirection(cardText);

  const progressLabel = useMemo(() => {
    if (total === 0) {
      return "0 / 0";
    }

    return `${index + 1} / ${total}`;
  }, [index, total]);

  function goTo(nextIndex: number): void {
    if (nextIndex < 0 || nextIndex >= total) {
      return;
    }

    setIndex(nextIndex);
    setRevealed(false);
  }

  if (total === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">No flashcards match the current filters.</p>
        <Link
          href={backHref}
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground" dir="auto">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-muted-light">{progressLabel}</span>
      </div>

      <FlashcardReadAloudControls
        question={currentCard.question}
        answer={currentCard.answer}
        revealed={revealed}
        cardKey={`${currentCard.noteSlug}-${index}`}
      />

      <button
        type="button"
        className="ui-card-padded block w-full min-h-48 text-left transition-colors hover:bg-accent-cream/25"
        onClick={() => setRevealed((value) => !value)}
        aria-expanded={revealed}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
          {revealed ? "Answer" : "Question"}
        </p>
        <p
          className="mt-3 text-base leading-relaxed text-foreground"
          dir={cardDirection}
          lang={textDirectionLang(cardDirection)}
        >
          {revealed ? currentCard.answer : currentCard.question}
        </p>
        <p className="mt-4 text-xs text-muted-light">
          {revealed ? "Tap to hide answer" : "Tap to reveal answer"}
        </p>
      </button>

      <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted">
        <p className="font-medium text-foreground" dir="auto">
          {currentCard.noteTitle}
        </p>
        <p>
          {currentCard.sectionLabel}
          {currentCard.playlist ? ` · ${currentCard.playlist}` : ""}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="ui-btn-secondary px-4 text-sm"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="ui-btn-secondary px-4 text-sm"
          onClick={() => goTo(index + 1)}
          disabled={index >= total - 1}
        >
          Next
        </button>
      </div>

      <Link
        href={backHref}
        className="inline-block text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        Back
      </Link>
    </div>
  );
}
