"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FlashcardReadAloudControls } from "@/components/life-lab/read-aloud-controls";
import { FlashcardSourceLink } from "@/components/life-lab/flashcard-source-link";
import { MermaidBlock } from "@/components/life-lab/mermaid-block";
import { ReadableText } from "@/components/life-lab/readable-text";
import { useLifeLabReadingMode } from "@/components/life-lab/life-lab-reading-mode";
import { LifeLabReadingControls } from "@/components/life-lab/life-lab-reading-controls";
import { useFlashcardSession } from "@/components/life-lab/use-flashcard-session";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import type { FlashcardWithDictionaryLink } from "@/lib/life-lab/flashcard-dictionary-link";
import {
  serializeMemoNextDeck,
  type MemoNextParseIssue,
} from "@/lib/life-lab/memonext-deck";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

export type FlashcardExploreDeck = {
  id: string;
  title: string;
  cards: FlashcardWithDictionaryLink[];
  sourceNoteHref?: string | null;
  sourceNoteTitle?: string | null;
  sourceSectionId?: LifeLabSectionId | null;
  category?: string | null;
  parseIssues?: MemoNextParseIssue[];
  exportHeaders?: {
    title?: string;
    category?: string;
    source?: string;
    lifeLabNote?: string;
    language?: string;
    tags?: string[];
  };
};

type FlashcardExploreProps = {
  deck: FlashcardExploreDeck;
  backHref: string;
  developerMode?: boolean;
};

function CardFaceText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { preferences, studyTargets } = useLifeLabReadingMode();
  const direction = resolveTextDirection(text);

  return (
    <p
      className={`leading-relaxed text-foreground ${className}`.trim()}
      dir={direction}
      lang={textDirectionLang(direction)}
    >
      <ReadableText mode={preferences.readingMode} studyTargets={studyTargets}>
        {text}
      </ReadableText>
    </p>
  );
}

function downloadDeckTxt(deck: FlashcardExploreDeck): void {
  const text = serializeMemoNextDeck({
    headers: {
      title: deck.exportHeaders?.title ?? deck.title,
      category: deck.exportHeaders?.category ?? deck.category ?? undefined,
      source: deck.exportHeaders?.source,
      lifeLabNote: deck.exportHeaders?.lifeLabNote,
      language: deck.exportHeaders?.language,
      tags: deck.exportHeaders?.tags,
    },
    cards: deck.cards,
  });
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${deck.title.replace(/[^\w\-]+/g, "-").toLowerCase() || "deck"}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures.
  }
}

export function FlashcardExplore({
  deck,
  backHref,
  developerMode = false,
}: FlashcardExploreProps) {
  const cards = deck.cards;
  const total = cards.length;
  const [mode, setMode] = useState<"explore" | "all">("explore");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const session = useFlashcardSession(deck.id, total);
  const { viewIndex, goTo, setRevealed } = session;

  const currentCard = cards[session.cardIndex];
  const dictionaryHref = currentCard?.dictionaryHref ?? null;
  const dictionaryAmbiguity = currentCard?.dictionaryAmbiguity ?? [];
  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return cards.map((card, index) => ({ card, index }));
    }

    return cards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) =>
        [card.question, card.answer, card.example, card.context]
          .filter(Boolean)
          .join("\n")
          .toLowerCase()
          .includes(q),
      );
  }, [cards, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (mode !== "explore") {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "j") {
        event.preventDefault();
        goTo(viewIndex + 1);
      } else if (event.key === "ArrowLeft" || event.key === "k") {
        event.preventDefault();
        goTo(viewIndex - 1);
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setRevealed((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, viewIndex, goTo, setRevealed]);

  if (total === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {deck.parseIssues?.length
            ? "This deck could not be parsed."
            : "This deck has no cards."}
        </p>
        {developerMode && deck.parseIssues?.length ? (
          <ul className="space-y-1 text-xs text-muted">
            {deck.parseIssues.map((issue) => (
              <li key={`${issue.line}-${issue.message}`}>
                Line {issue.line}: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
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
    <div className="flashcard-explore space-y-4" data-flashcard-mode={mode}>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-foreground" dir="auto">
            {deck.title}
          </h2>
          <FlashcardSourceLink
            href={deck.sourceNoteHref ?? null}
            title={deck.sourceNoteTitle ?? null}
            sectionId={deck.sourceSectionId}
          />
          {dictionaryHref ? (
            <Link
              href={dictionaryHref}
              className="text-sm font-medium text-muted underline-offset-2 hover:underline"
            >
              Open dictionary entry
            </Link>
          ) : null}
          {developerMode && dictionaryAmbiguity.length > 1 ? (
            <p className="text-xs text-muted-light">
              Dictionary match ambiguous (
              {dictionaryAmbiguity.map((entry) => entry.title).join(", ")})
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LifeLabReadingControls />
          <span className="text-xs text-muted-light" aria-live="polite">
            {session.viewIndex + 1} / {total}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            mode === "explore"
              ? "bg-accent-cream text-foreground"
              : "border border-border/70 text-muted"
          }`}
          onClick={() => setMode("explore")}
        >
          Explore
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            mode === "all"
              ? "bg-accent-cream text-foreground"
              : "border border-border/70 text-muted"
          }`}
          onClick={() => setMode("all")}
        >
          Show all cards
        </button>
        <button
          type="button"
          className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
          onClick={() => downloadDeckTxt(deck)}
          aria-label="Download deck as text"
        >
          Export
        </button>
        <button
          type="button"
          className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
          onClick={() =>
            void copyText(
              serializeMemoNextDeck({
                headers: { title: deck.title },
                cards: deck.cards,
              }),
            )
          }
          aria-label="Copy all cards"
        >
          Copy all
        </button>
        {deck.sourceNoteHref ? (
          <Link
            href={deck.sourceNoteHref}
            className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
          >
            Open source note
          </Link>
        ) : null}
      </div>

      {mode === "all" ? (
        <div className="flashcard-show-all space-y-3">
          <label className="block print:hidden">
            <span className="sr-only">Search cards</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this deck"
              className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
            />
          </label>
          <ul className="space-y-3">
            {filteredAll.map(({ card, index }) => {
              const open = Boolean(expanded[index]);
              return (
                <li
                  key={`${index}-${card.question.slice(0, 24)}`}
                  className="ui-card-padded flashcard-all-item space-y-2 break-inside-avoid"
                >
                  <button
                    type="button"
                    className="w-full text-left print:hidden"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [index]: !prev[index],
                      }))
                    }
                    aria-expanded={open}
                  >
                    <p className="font-medium text-foreground" dir="auto">
                      {card.question}
                    </p>
                    <p className="mt-1 text-xs text-muted-light">
                      {open ? "Hide answer" : "Show answer"}
                    </p>
                  </button>
                  <p
                    className="hidden font-medium text-foreground print:block"
                    dir="auto"
                  >
                    {card.question}
                  </p>
                  <div
                    className={`space-y-2 border-t border-border/50 pt-2 ${
                      open ? "block" : "hidden print:block"
                    }`}
                  >
                    <p
                      className="text-sm leading-relaxed text-foreground"
                      dir="auto"
                    >
                      {card.answer}
                    </p>
                    {card.example ? (
                      <p className="text-sm text-muted" dir="auto">
                        {card.example}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <>
          <FlashcardReadAloudControls
            question={currentCard!.question}
            answer={currentCard!.answer}
            revealed={session.revealed}
            cardKey={`${deck.id}-${session.cardIndex}`}
            className="print:hidden"
          />

          <div
            className="ui-card-padded min-h-[14rem] space-y-4 sm:min-h-[18rem]"
            onTouchStart={(event) =>
              setTouchStartX(event.changedTouches[0]?.clientX ?? null)
            }
            onTouchEnd={(event) => {
              if (touchStartX == null) {
                return;
              }
              const endX = event.changedTouches[0]?.clientX ?? touchStartX;
              const delta = endX - touchStartX;
              setTouchStartX(null);
              if (Math.abs(delta) < 56) {
                return;
              }
              if (delta < 0) {
                session.goTo(session.viewIndex + 1);
              } else {
                session.goTo(session.viewIndex - 1);
              }
            }}
          >
            {currentCard?.diagramSource ? (
              <div className="overflow-x-auto">
                <MermaidBlock code={currentCard.diagramSource} />
              </div>
            ) : null}

            <button
              type="button"
              className="block w-full text-left"
              onClick={() => session.setRevealed((value) => !value)}
              aria-expanded={session.revealed}
              aria-label={
                session.revealed ? "Hide answer" : "Reveal answer"
              }
            >
              <span className="sr-only" aria-live="polite">
                {session.revealed ? "Answer revealed" : "Answer hidden"}
              </span>
              <CardFaceText
                text={currentCard!.question}
                className="text-lg sm:text-xl"
              />
              {session.revealed ? (
                <div className="mt-5 space-y-3 border-t border-border/60 pt-5">
                  <CardFaceText
                    text={currentCard!.answer}
                    className="text-base sm:text-lg"
                  />
                  {currentCard?.example ? (
                    <CardFaceText
                      text={currentCard.example}
                      className="text-sm text-muted"
                    />
                  ) : null}
                  {currentCard?.context ? (
                    <p
                      className="text-sm leading-relaxed text-muted"
                      dir="auto"
                    >
                      {currentCard.context}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm text-muted-light print:hidden">
                  Tap to reveal answer
                </p>
              )}
            </button>
          </div>

          <div className="flashcard-explore-controls sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-sm backdrop-blur print:hidden">
            <button
              type="button"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted disabled:opacity-40"
              onClick={() => session.goTo(session.viewIndex - 1)}
              disabled={session.viewIndex <= 0}
              aria-label="Previous card"
            >
              Previous
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
                onClick={() => session.setRevealed((value) => !value)}
              >
                {session.revealed ? "Hide answer" : "Reveal"}
              </button>
              <button
                type="button"
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
                onClick={() => session.shuffle()}
              >
                Shuffle
              </button>
              <button
                type="button"
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
                onClick={() => session.restart()}
              >
                Restart
              </button>
              <button
                type="button"
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted"
                onClick={() =>
                  void copyText(
                    `Q: ${currentCard!.question}\nA: ${currentCard!.answer}${
                      currentCard?.example
                        ? `\nExample: ${currentCard.example}`
                        : ""
                    }`,
                  )
                }
                aria-label="Copy current card"
              >
                Copy
              </button>
            </div>
            <button
              type="button"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted disabled:opacity-40"
              onClick={() => session.goTo(session.viewIndex + 1)}
              disabled={session.viewIndex >= total - 1}
              aria-label="Next card"
            >
              Next
            </button>
          </div>
        </>
      )}

      <div className="print:hidden">
        <Link
          href={backHref}
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
