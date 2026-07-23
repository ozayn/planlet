"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  AppNavMenuButton,
  useAppNavDrawer,
} from "@/components/app-nav/app-nav-drawer";
import { LifeLabArchiveMenuItem } from "@/components/life-lab/life-lab-archive-menu-item";
import { FlashcardReadAloudControls } from "@/components/life-lab/read-aloud-controls";
import { MermaidBlock } from "@/components/life-lab/mermaid-block";
import { ReadableText } from "@/components/life-lab/readable-text";
import { useLifeLabReadingMode } from "@/components/life-lab/life-lab-reading-mode";
import { LifeLabReadingControls } from "@/components/life-lab/life-lab-reading-controls";
import { useFlashcardSession } from "@/components/life-lab/use-flashcard-session";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import type { FlashcardWithDictionaryLink } from "@/lib/life-lab/flashcard-dictionary-link";
import { resolveFlashcardDeckHeader } from "@/lib/life-lab/flashcard-explore-ui";
import { buildFlashcardDeckItemKey } from "@/lib/life-lab/item-key";
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
  initiallyArchived?: boolean;
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

function MoreMenuButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function useCloseNavDrawerOnceOnMount() {
  const { closeDrawer } = useAppNavDrawer();
  const closedOnceRef = useRef(false);

  useEffect(() => {
    if (closedOnceRef.current) {
      return;
    }
    closedOnceRef.current = true;

    const isCompactChrome =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 1023px)").matches ||
        window.matchMedia("(max-height: 600px) and (pointer: coarse)").matches);

    if (isCompactChrome) {
      closeDrawer();
    }
  }, [closeDrawer]);
}

export function FlashcardExplore({
  deck,
  backHref,
  developerMode = false,
  initiallyArchived = false,
}: FlashcardExploreProps) {
  const cards = deck.cards;
  const total = cards.length;
  const [mode, setMode] = useState<"explore" | "all">("explore");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deckArchived, setDeckArchived] = useState(initiallyArchived);
  const session = useFlashcardSession(deck.id, total);
  const { viewIndex, goTo, setRevealed } = session;
  useCloseNavDrawerOnceOnMount();

  const header = useMemo(
    () =>
      resolveFlashcardDeckHeader({
        title: deck.title,
        sourceNoteTitle: deck.sourceNoteTitle,
        sourceNoteHref: deck.sourceNoteHref,
        sourceSectionId: deck.sourceSectionId,
        category: deck.category,
      }),
    [
      deck.title,
      deck.sourceNoteTitle,
      deck.sourceNoteHref,
      deck.sourceSectionId,
      deck.category,
    ],
  );

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

  function closeMore(): void {
    setMoreOpen(false);
  }

  if (total === 0) {
    return (
      <div className="space-y-4" data-flashcard-explore="empty">
        <div className="flex items-center gap-2">
          <AppNavMenuButton />
          <Link
            href={backHref}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Back
          </Link>
          <h1
            className="min-w-0 truncate text-base font-semibold text-foreground"
            title={header.fullTitle}
            dir="auto"
          >
            {header.shortTitle}
          </h1>
        </div>
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
      </div>
    );
  }

  if (mode === "all") {
    return (
      <div
        className="flashcard-explore flashcard-show-all space-y-4"
        data-flashcard-mode="all"
      >
        <div className="flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            onClick={() => setMode("explore")}
          >
            Back to Explore
          </button>
          <h1
            className="min-w-0 truncate text-base font-semibold text-foreground"
            title={header.fullTitle}
            dir="auto"
          >
            <span className="lg:hidden">{header.shortTitle}</span>
            <span className="hidden lg:inline">{header.displayTitle}</span>
          </h1>
        </div>

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
    );
  }

  return (
    <div
      className="flashcard-explore space-y-2 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:space-y-3 sm:pb-4 lg:space-y-4"
      data-flashcard-mode="explore"
      data-flashcard-layout="card-first"
    >
      <header
        className="flashcard-explore-topbar flex items-center gap-1.5 print:hidden sm:gap-2"
        data-flashcard-header="compact"
      >
        <AppNavMenuButton className="shrink-0" />
        <Link
          href={backHref}
          className="shrink-0 rounded-full px-2 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          aria-label="Back to flashcard decks"
          data-flashcard-back="true"
        >
          Back
        </Link>

        <h1
          className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base"
          title={header.fullTitle}
          dir="auto"
          data-flashcard-title="once"
        >
          <span className="lg:hidden">{header.shortTitle}</span>
          <span className="hidden lg:inline">{header.displayTitle}</span>
        </h1>

        <span
          className="shrink-0 text-xs tabular-nums text-muted-light"
          aria-live="polite"
        >
          {session.viewIndex + 1} / {total}
        </span>

        <div className="shrink-0" data-flashcard-listen="topbar">
          <FlashcardReadAloudControls
            question={currentCard!.question}
            answer={currentCard!.answer}
            revealed={session.revealed}
            cardKey={`${deck.id}-${session.cardIndex}`}
            compact
            developerMode={developerMode}
          />
        </div>

        <details
          className="flashcard-more relative shrink-0"
          open={moreOpen}
          onToggle={(event) =>
            setMoreOpen((event.target as HTMLDetailsElement).open)
          }
        >
          <summary
            className="inline-flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-full border border-border/70 text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border [&::-webkit-details-marker]:hidden"
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </summary>
          <div className="flashcard-more-panel absolute right-0 z-30 mt-2 w-[min(100vw-1.5rem,17rem)] rounded-xl border border-border/70 bg-background py-1 shadow-lg">
            {header.sourceLine ? (
              <p
                className="px-3 py-2 text-xs text-muted-light"
                data-flashcard-source-line="more"
              >
                {header.sourceLine}
              </p>
            ) : null}
            <MoreMenuButton
              onClick={() => {
                setMode("all");
                closeMore();
              }}
            >
              Show all cards
            </MoreMenuButton>
            <MoreMenuButton
              onClick={() => {
                session.shuffle();
                closeMore();
              }}
            >
              Shuffle
            </MoreMenuButton>
            <MoreMenuButton
              onClick={() => {
                session.restart();
                closeMore();
              }}
            >
              Restart
            </MoreMenuButton>
            <MoreMenuButton
              onClick={() => {
                void copyText(
                  `Q: ${currentCard!.question}\nA: ${currentCard!.answer}${
                    currentCard?.example
                      ? `\nExample: ${currentCard.example}`
                      : ""
                  }`,
                );
                closeMore();
              }}
            >
              Copy card
            </MoreMenuButton>
            <MoreMenuButton
              onClick={() => {
                void copyText(
                  serializeMemoNextDeck({
                    headers: { title: deck.title },
                    cards: deck.cards,
                  }),
                );
                closeMore();
              }}
            >
              Copy all
            </MoreMenuButton>
            <MoreMenuButton
              onClick={() => {
                downloadDeckTxt(deck);
                closeMore();
              }}
            >
              Export
            </MoreMenuButton>
            {header.showOpenSourceNote && deck.sourceNoteHref ? (
              <Link
                href={deck.sourceNoteHref}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/40"
                onClick={closeMore}
              >
                Open source note
              </Link>
            ) : null}
            <div className="border-t border-border/50 py-1">
              <LifeLabArchiveMenuItem
                itemKey={buildFlashcardDeckItemKey(deck.id)}
                section="flashcards"
                itemType="flashcard-deck"
                archived={deckArchived}
                labels={{
                  archive: ACTION_LABELS.archiveFlashcardDeck,
                  unarchive: ACTION_LABELS.unarchiveFlashcardDeck,
                }}
                onArchivedChange={setDeckArchived}
              />
            </div>
            {dictionaryHref ? (
              <Link
                href={dictionaryHref}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/40"
                onClick={closeMore}
              >
                Open dictionary entry
              </Link>
            ) : null}
            <div className="border-t border-border/50 px-3 py-2">
              <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
                Reading
              </p>
              <LifeLabReadingControls variant="panel" />
            </div>
            {developerMode && dictionaryAmbiguity.length > 1 ? (
              <p className="border-t border-border/50 px-3 py-2 text-xs text-muted-light">
                Dictionary match ambiguous (
                {dictionaryAmbiguity.map((entry) => entry.title).join(", ")})
              </p>
            ) : null}
          </div>
        </details>
      </header>

      <div
        className="flashcard-face w-full rounded-2xl border border-border/60 bg-surface px-4 py-4 sm:px-5 sm:py-5"
        data-flashcard-card="true"
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
          <div className="mb-4 overflow-x-auto">
            <MermaidBlock code={currentCard.diagramSource} />
          </div>
        ) : null}

        <button
          type="button"
          className="flashcard-face-toggle block w-full min-h-[clamp(12.5rem,42dvh,28rem)] cursor-pointer touch-manipulation text-left transition-[transform,opacity] duration-150 ease-out active:scale-[0.992] active:opacity-95 sm:min-h-[clamp(14rem,40dvh,30rem)]"
          onClick={() => session.setRevealed((value) => !value)}
          aria-expanded={session.revealed}
          aria-label={session.revealed ? "Hide answer" : "Reveal answer"}
        >
          <span className="sr-only" aria-live="polite">
            {session.revealed ? "Answer revealed" : "Answer hidden. Activate to reveal."}
          </span>
          <CardFaceText
            text={currentCard!.question}
            className="text-lg sm:text-xl"
          />
          {session.revealed ? (
            <div
              className="flashcard-answer-reveal mt-4 space-y-3 border-t border-border/60 pt-4 sm:mt-5 sm:pt-5"
              data-flashcard-answer="revealed"
            >
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
                <p className="text-sm leading-relaxed text-muted" dir="auto">
                  {currentCard.context}
                </p>
              ) : null}
            </div>
          ) : null}
        </button>
      </div>

      <div className="hidden justify-center gap-2 print:hidden lg:flex">
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
      </div>

      <div
        className="flashcard-explore-controls fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur print:hidden lg:sticky lg:bottom-3 lg:inset-x-auto lg:rounded-2xl lg:border lg:px-3 lg:py-2 lg:shadow-sm"
        data-flashcard-nav="sticky"
      >
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-2 lg:max-w-3xl">
          <button
            type="button"
            className="min-h-11 min-w-[4.5rem] rounded-full px-3 py-2 text-sm font-medium text-muted disabled:opacity-40"
            onClick={() => session.goTo(session.viewIndex - 1)}
            disabled={session.viewIndex <= 0}
            aria-label="Previous card"
          >
            Previous
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full bg-accent-cream px-4 py-2 text-sm font-medium text-foreground"
            onClick={() => session.setRevealed((value) => !value)}
            aria-label={session.revealed ? "Hide answer" : "Reveal answer"}
          >
            {session.revealed ? "Hide" : "Reveal"}
          </button>
          <button
            type="button"
            className="min-h-11 min-w-[4.5rem] rounded-full px-3 py-2 text-sm font-medium text-muted disabled:opacity-40"
            onClick={() => session.goTo(session.viewIndex + 1)}
            disabled={session.viewIndex >= total - 1}
            aria-label="Next card"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
