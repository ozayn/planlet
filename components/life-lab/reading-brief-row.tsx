"use client";

import Link from "next/link";

type ReadingBriefRowProps = {
  href: string;
  title: string;
  subtitle?: string | null;
  dateLabel?: string | null;
  excerpt?: string | null;
  layout?: "stacked-date" | "title-date";
};

export function ReadingBriefRow({
  href,
  title,
  subtitle,
  dateLabel,
  excerpt,
  layout = "title-date",
}: ReadingBriefRowProps) {
  return (
    <li className="border-b border-border/40 last:border-b-0">
      <Link
        href={href}
        className="block min-h-11 px-0.5 py-2.5 transition-colors hover:bg-accent-cream/20 focus-visible:bg-accent-cream/20 focus-visible:outline-none"
      >
        {layout === "stacked-date" ? (
          <span className="flex flex-col gap-0.5">
            {dateLabel ? (
              <span className="text-[0.6875rem] text-muted-light">{dateLabel}</span>
            ) : null}
            <span
              dir="auto"
              className="line-clamp-2 text-sm font-medium leading-snug text-foreground"
            >
              {title}
            </span>
            {subtitle ? (
              <span dir="auto" className="line-clamp-1 text-sm text-muted">
                {subtitle}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1 space-y-0.5">
              <span
                dir="auto"
                className="line-clamp-2 block text-sm font-medium leading-snug text-foreground"
              >
                {title}
              </span>
              {excerpt ? (
                <span
                  dir="auto"
                  className="line-clamp-1 block text-sm leading-snug text-muted"
                >
                  {excerpt}
                </span>
              ) : null}
            </span>
            {dateLabel ? (
              <span className="shrink-0 pt-0.5 text-[0.6875rem] text-muted-light">
                {dateLabel}
              </span>
            ) : null}
          </span>
        )}
      </Link>
    </li>
  );
}
