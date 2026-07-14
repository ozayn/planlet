import Link from "next/link";
import { BookMarked } from "lucide-react";
import type { ReactNode } from "react";

import { LifeLabFlashcardList } from "@/components/life-lab/life-lab-flashcard-list";
import type { DictionaryEntryModel } from "@/lib/learning-dictionary/model";
import { resolveTextDirection } from "@/lib/text-direction";

type LearningDictionaryEntryProps = {
  entry: DictionaryEntryModel;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function LearningDictionaryEntryView({
  entry,
}: LearningDictionaryEntryProps) {
  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {entry.typeLabel ? (
            <span className="rounded-md bg-accent-cream/60 px-2 py-0.5 text-xs font-medium">
              {entry.typeLabel}
            </span>
          ) : null}
          {entry.languageLabel ? (
            <span className="rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted">
              {entry.languageLabel}
            </span>
          ) : null}
          {entry.categoryLabel ? (
            <span className="text-xs text-muted-light">{entry.categoryLabel}</span>
          ) : null}
          {entry.reviewStatusLabel ? (
            <span className="text-xs text-muted-light">
              {entry.reviewStatusLabel}
            </span>
          ) : null}
        </div>

        <div className="flex gap-3">
          <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-accent-cream/20 sm:block">
            {entry.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted/45">
                <BookMarked className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            {entry.aliases.length > 0 ? (
              <p className="text-sm text-muted">
                Also: {entry.aliases.join(", ")}
              </p>
            ) : null}
            <p className="text-xs text-muted-light">
              {[
                entry.occurrences != null
                  ? `${entry.occurrences} encounters`
                  : null,
                entry.sourceNoteLinks.length > 0
                  ? `${entry.sourceNoteLinks.length} sources`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </header>

      {entry.meaning ? (
        <Section title="Meaning">
          <p
            dir={resolveTextDirection(entry.meaning)}
            className="text-sm leading-relaxed text-foreground/90"
          >
            {entry.meaning}
          </p>
        </Section>
      ) : null}

      {entry.whyUseful ? (
        <Section title="Why it is useful">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {entry.whyUseful}
          </p>
        </Section>
      ) : null}

      {entry.examples.length > 0 ? (
        <Section title="Example sentences">
          <ul className="space-y-2">
            {entry.examples.map((example) => (
              <li
                key={example}
                dir={resolveTextDirection(example)}
                className="rounded-lg border border-border/40 bg-accent-cream/15 px-3 py-2 text-sm leading-relaxed text-foreground/90"
              >
                {example}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {entry.relatedPhrases.length > 0 ? (
        <Section title="Related phrases">
          <ul className="flex flex-wrap gap-1.5">
            {entry.relatedPhrases.map((phrase) => (
              <li
                key={phrase}
                className="rounded-full bg-accent-cream/50 px-2.5 py-1 text-xs text-foreground/80"
              >
                {phrase}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {entry.relatedConcepts.length > 0 ? (
        <Section title="Related concepts">
          <ul className="flex flex-wrap gap-1.5">
            {entry.relatedConcepts.map((concept) => (
              <li
                key={concept}
                className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted"
              >
                {concept}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {entry.sourceNoteLinks.length > 0 ? (
        <Section title="Found in">
          <ul className="space-y-1.5">
            {entry.sourceNoteLinks.map((source) => (
              <li key={`${source.href}-${source.label}`}>
                <Link
                  href={source.href}
                  className="text-sm text-foreground underline-offset-2 hover:underline"
                >
                  {source.label}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : entry.foundIn.length > 0 ? (
        <Section title="Found in">
          <ul className="space-y-1 text-sm text-muted">
            {entry.foundIn.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {entry.tags.length > 0 ? (
        <Section title="Tags">
          <ul className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-accent-cream/40 px-2 py-0.5 text-xs text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {entry.flashcards.length > 0 ? (
        <Section title="Flashcard preview">
          <LifeLabFlashcardList
            cards={entry.flashcards.slice(0, 4)}
            title="Study cards"
          />
        </Section>
      ) : null}

      {entry.relatedEntries.length > 0 ? (
        <Section title="Related entries">
          <ul className="space-y-2">
            {entry.relatedEntries.map((related) => (
              <li key={related.slug}>
                <Link
                  href={related.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent-cream/20"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {related.title}
                    </span>
                    <span className="text-[0.6875rem] text-muted-light">
                      {[related.typeLabel, related.reason]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <p className="text-xs text-muted-light">
        Also available in{" "}
        <Link
          href={`/life-lab/learning-dictionary/${entry.slug}`}
          className="underline-offset-2 hover:underline"
        >
          Life Lab
        </Link>
        .
      </p>
    </article>
  );
}
