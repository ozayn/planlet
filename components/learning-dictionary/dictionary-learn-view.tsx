"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useAppNavDrawer } from "@/components/app-nav/app-nav-drawer";
import { DictionaryStudySummary } from "@/components/learning-dictionary/dictionary-study-summary";
import { LearningStateControls } from "@/components/learning-dictionary/learning-state-controls";
import { SessionProgress } from "@/components/learning-dictionary/session-progress";
import { FlashcardReadAloudControls } from "@/components/life-lab/read-aloud-controls";
import { setDictionaryStudyStatusAction } from "@/app/(app)/learning-dictionary/study-actions";
import {
  buildDictionaryLearnSession,
  summarizeDictionarySessionResults,
  type DictionaryLearnItem,
} from "@/lib/learning-dictionary/learn-session";
import {
  nextDictionaryStudyStatus,
  type DictionarySessionSize,
  type DictionaryStudyStatus,
} from "@/lib/learning-dictionary/study-state";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type DictionaryLearnViewProps = {
  items: DictionaryLearnItem[];
  /** Browse destination for empty/done actions. */
  browseHref?: string;
};

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

function ExploreCard({
  item,
  revealed,
  onReveal,
}: {
  item: DictionaryLearnItem;
  revealed: boolean;
  onReveal: () => void;
}) {
  const termDir = resolveTextDirection(item.title);
  const definitionDir = resolveTextDirection(item.definition);
  const exampleDir = item.example
    ? resolveTextDirection(item.example)
    : null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!revealed) {
          onReveal();
        }
      }}
      className="dictionary-explore-card flex min-h-[14rem] w-full flex-col justify-center gap-4 rounded-2xl border border-border/60 bg-surface px-5 py-6 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:min-h-[16rem] sm:px-7 sm:py-8"
      data-dictionary-explore-card=""
      aria-label={
        revealed
          ? `${item.title}. ${item.definition}`
          : `${item.title}. Reveal meaning`
      }
    >
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="mx-auto mb-1 h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
        />
      ) : null}

      <p
        className="text-center text-[length:var(--density-text-h2)] font-semibold leading-snug text-foreground sm:text-[1.375rem]"
        dir="auto"
        lang={textDirectionLang(termDir)}
      >
        {item.title}
      </p>

      {revealed ? (
        <div className="space-y-3 text-center">
          {item.definition ? (
            <p
              className="text-[length:var(--density-text-body)] leading-relaxed text-foreground"
              dir="auto"
              lang={textDirectionLang(definitionDir)}
            >
              {item.definition}
            </p>
          ) : (
            <p className="text-sm text-muted">No definition available yet.</p>
          )}
          {item.example ? (
            <p
              className="text-sm leading-relaxed text-muted"
              dir="auto"
              lang={exampleDir ? textDirectionLang(exampleDir) : undefined}
            >
              {item.example}
            </p>
          ) : null}
          {item.translation ? (
            <p className="text-sm text-muted" dir="auto">
              {item.translation}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">Tap to reveal meaning</p>
      )}
    </button>
  );
}

export function DictionaryLearnView({
  items,
  browseHref = "/learning-dictionary",
}: DictionaryLearnViewProps) {
  useCloseNavDrawerOnceOnMount();

  const [sessionSize, setSessionSize] = useState<DictionarySessionSize>(10);
  const [includeKnown, setIncludeKnown] = useState(false);
  const [knownOnly, setKnownOnly] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [statusByKey, setStatusByKey] = useState<
    Record<string, DictionaryStudyStatus>
  >(() =>
    Object.fromEntries(items.map((item) => [item.itemKey, item.studyStatus])),
  );
  const [sessionStatuses, setSessionStatuses] = useState<
    DictionaryStudyStatus[]
  >([]);
  const [pending, startTransition] = useTransition();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const itemsWithStatus = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        studyStatus: statusByKey[item.itemKey] ?? item.studyStatus,
      })),
    [items, statusByKey],
  );

  const session = useMemo(
    () =>
      buildDictionaryLearnSession(itemsWithStatus, {
        size: sessionSize,
        includeKnown,
        knownOnly,
      }),
    [itemsWithStatus, sessionSize, includeKnown, knownOnly, sessionKey],
  );

  const current = session[index] ?? null;
  const summary = summarizeDictionarySessionResults(sessionStatuses);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (session.length === 0) {
        return;
      }

      const clamped = Math.max(0, Math.min(nextIndex, session.length - 1));
      setIndex(clamped);
      setRevealed(false);
    },
    [session.length],
  );

  const persistStatus = useCallback(
    (itemKey: string, status: DictionaryStudyStatus) => {
      setStatusByKey((current) => ({ ...current, [itemKey]: status }));
      startTransition(async () => {
        await setDictionaryStudyStatusAction({
          itemKey,
          studyStatus: status,
        });
      });
    },
    [],
  );

  const advanceAfterMark = useCallback(
    (status: DictionaryStudyStatus) => {
      if (!current) {
        return;
      }

      persistStatus(current.itemKey, status);
      setSessionStatuses((currentStatuses) => {
        const next = [...currentStatuses];
        next[index] = status;
        return next;
      });

      if (index >= session.length - 1) {
        setComplete(true);
        setRevealed(false);
        return;
      }

      goTo(index + 1);
    },
    [current, goTo, index, persistStatus, session.length],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        (event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.isContentEditable)
      ) {
        return;
      }

      if (complete) {
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setRevealed(true);
        return;
      }

      if (event.key === "ArrowRight" || event.key === "j") {
        event.preventDefault();
        goTo(index + 1);
      }

      if (event.key === "ArrowLeft" || event.key === "k") {
        event.preventDefault();
        goTo(index - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [complete, goTo, index]);

  function restartSession(options?: {
    knownOnly?: boolean;
    includeKnown?: boolean;
  }) {
    setKnownOnly(options?.knownOnly ?? false);
    setIncludeKnown(options?.includeKnown ?? false);
    setSessionKey((value) => value + 1);
    setIndex(0);
    setRevealed(false);
    setComplete(false);
    setSessionStatuses([]);
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-border/60 px-4 py-6 text-center">
        <p className="text-sm text-muted">Nothing to review right now.</p>
        <Link
          href={browseHref}
          className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-foreground"
        >
          Browse dictionary
        </Link>
      </div>
    );
  }

  if (session.length === 0) {
    return (
      <div className="space-y-4 rounded-xl border border-border/60 px-4 py-6 text-center">
        <p className="text-sm text-muted">Nothing to review right now.</p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => restartSession({ knownOnly: true, includeKnown: true })}
            className="inline-flex min-h-11 items-center rounded-xl border border-border/70 px-3 text-sm font-medium text-muted hover:bg-accent-cream/40 hover:text-foreground"
          >
            Review known concepts
          </button>
          <Link
            href={browseHref}
            className="inline-flex min-h-11 items-center text-sm font-medium text-foreground"
          >
            Browse dictionary
          </Link>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <DictionaryStudySummary
        total={summary.total || session.length}
        known={summary.known}
        learning={summary.learning}
        onContinue={() => restartSession()}
        onDone={() => {
          window.location.href = browseHref;
        }}
      />
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
      data-dictionary-learn-view=""
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SessionProgress current={index + 1} total={session.length} />
        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="sr-only">Session size</span>
          <select
            value={sessionSize}
            onChange={(event) => {
              const value = event.target.value;
              setSessionSize(
                value === "all" || value === "due"
                  ? value
                  : (Number(value) as DictionarySessionSize),
              );
              restartSession({ includeKnown, knownOnly });
            }}
            className="rounded-lg border border-border/70 bg-background px-2 py-1.5 text-xs"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value="due">All due</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          const touch = event.changedTouches[0];
          if (!start || !touch) return;

          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;

          if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) {
            return;
          }

          if (dx < 0) {
            goTo(index + 1);
          } else {
            goTo(index - 1);
          }
        }}
      >
        {current ? (
          <ExploreCard
            item={current}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
          />
        ) : null}
      </div>

      {current ? (
        <FlashcardReadAloudControls
          cardKey={current.itemKey}
          question={current.title}
          answer={current.definition}
          revealed={revealed}
        />
      ) : null}

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border/70 text-sm font-medium text-foreground transition-colors hover:bg-accent-cream/40"
        >
          Reveal meaning
        </button>
      ) : (
        <LearningStateControls
          disabled={pending}
          onNotYet={() =>
            advanceAfterMark(nextDictionaryStudyStatus("not-yet"))
          }
          onLearning={() =>
            advanceAfterMark(nextDictionaryStudyStatus("learning"))
          }
          onKnow={() => advanceAfterMark(nextDictionaryStudyStatus("know"))}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground disabled:opacity-40"
        >
          Previous
        </button>

        <details className="relative">
          <summary className="inline-flex min-h-11 list-none items-center justify-center rounded-xl px-3 text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">More</span>
          </summary>
          <div className="absolute bottom-full end-0 z-20 mb-2 w-48 overflow-hidden rounded-xl border border-border/70 bg-surface shadow-sm">
            {current ? (
              <>
                <Link
                  href={current.href}
                  className="block px-3 py-2.5 text-sm text-foreground hover:bg-accent-cream/40"
                >
                  Open dictionary entry
                </Link>
                {current.sourceNoteHref ? (
                  <Link
                    href={current.sourceNoteHref}
                    className="block px-3 py-2.5 text-sm text-foreground hover:bg-accent-cream/40"
                  >
                    {current.sourceNoteLabel ?? "Source note"}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="block w-full px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent-cream/40"
                  onClick={() => {
                    persistStatus(
                      current.itemKey,
                      nextDictionaryStudyStatus("revisit"),
                    );
                  }}
                >
                  Revisit
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent-cream/40"
                  onClick={() => {
                    persistStatus(
                      current.itemKey,
                      nextDictionaryStudyStatus("reset"),
                    );
                  }}
                >
                  Reset to New
                </button>
              </>
            ) : null}
          </div>
        </details>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= session.length - 1}
          className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {revealed && current ? (
        <details className="rounded-xl border border-border/50 px-3 py-2">
          <summary className="cursor-pointer text-sm text-muted">
            Details
          </summary>
          <div className="mt-2 space-y-1.5 text-sm text-muted">
            <Link
              href={current.href}
              className="block text-foreground hover:underline"
            >
              Open dictionary entry
            </Link>
            {current.sourceNoteHref ? (
              <Link
                href={current.sourceNoteHref}
                className="block text-foreground hover:underline"
              >
                {current.sourceNoteLabel ?? "Source note"}
              </Link>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
