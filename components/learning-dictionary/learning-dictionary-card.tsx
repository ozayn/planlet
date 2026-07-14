"use client";

import Link from "next/link";
import { BookMarked } from "lucide-react";

import type { DictionaryCardModel } from "@/lib/learning-dictionary/model";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type LearningDictionaryCardProps = {
  card: DictionaryCardModel;
};

export function LearningDictionaryCard({ card }: LearningDictionaryCardProps) {
  const direction = resolveTextDirection(card.title);
  const lang = textDirectionLang(direction);

  return (
    <li>
      <Link
        href={card.href}
        className="group flex gap-3 rounded-xl border border-border/50 bg-background px-3 py-3 transition-colors hover:bg-accent-cream/25"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-accent-cream/20">
          {card.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted/45">
              <BookMarked className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {card.typeLabel ? (
              <span className="rounded-md bg-accent-cream/60 px-1.5 py-0.5 text-[0.6875rem] font-medium text-foreground/80">
                {card.typeLabel}
              </span>
            ) : null}
            {card.languageLabel ? (
              <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[0.6875rem] text-muted">
                {card.languageLabel}
              </span>
            ) : null}
            {card.reviewStatusLabel ? (
              <span className="text-[0.6875rem] text-muted-light">
                {card.reviewStatusLabel}
              </span>
            ) : null}
          </div>

          <h2
            dir={direction}
            lang={lang}
            className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-foreground/85"
          >
            {card.title}
          </h2>

          {card.definition ? (
            <p
              dir={resolveTextDirection(card.definition)}
              className="line-clamp-2 text-sm leading-snug text-muted"
            >
              {card.definition}
            </p>
          ) : null}

          {card.tags.length > 0 ? (
            <p className="truncate text-[0.6875rem] text-muted-light">
              {card.tags.join(" · ")}
            </p>
          ) : null}

          <p className="text-[0.6875rem] text-muted-light">
            {[
              card.occurrences != null
                ? `${card.occurrences} encounter${card.occurrences === 1 ? "" : "s"}`
                : null,
              card.sourceCount > 0
                ? `${card.sourceCount} source${card.sourceCount === 1 ? "" : "s"}`
                : null,
              card.hasFlashcards
                ? `${card.flashcardCount || ""} card${card.flashcardCount === 1 ? "" : "s"}`.trim()
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>
    </li>
  );
}
