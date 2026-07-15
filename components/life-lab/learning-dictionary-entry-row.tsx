import Link from "next/link";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";

type LearningDictionaryEntryRowProps = {
  note: LifeLabNoteSummary;
  href: string;
};

export function LearningDictionaryEntryRow({
  note,
  href,
}: LearningDictionaryEntryRowProps) {
  const definition = note.excerpt?.trim() || note.metadata?.meaning?.trim() || "";
  const dateLabel = note.dateLabel ?? note.modifiedAtLabel;

  return (
    <li className="border-b border-border/40 last:border-b-0">
      <Link
        href={href}
        className="flex items-start justify-between gap-3 px-0.5 py-2.5 transition-colors hover:bg-accent-cream/20"
      >
        <span className="min-w-0 flex-1 space-y-0.5">
          <span
            dir="auto"
            className="block text-sm font-medium leading-snug text-foreground"
          >
            {note.title}
          </span>
          {definition ? (
            <span
              dir="auto"
              className="line-clamp-2 block text-sm leading-snug text-muted"
            >
              {definition}
            </span>
          ) : null}
        </span>
        {dateLabel ? (
          <span className="shrink-0 pt-0.5 text-[0.6875rem] text-muted-light">
            {dateLabel}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
