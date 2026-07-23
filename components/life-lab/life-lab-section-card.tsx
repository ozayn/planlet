import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type LifeLabSectionCardProps = {
  title: string;
  href: string;
  icon: LucideIcon;
  meta: string;
  isEmpty?: boolean;
  secondaryAction?: {
    href: string;
    label: string;
  };
  status?: ReactNode;
};

export function LifeLabSectionCard({
  title,
  href,
  icon: Icon,
  meta,
  isEmpty = false,
  secondaryAction,
  status,
}: LifeLabSectionCardProps) {
  return (
    <article
      className={`relative flex min-h-11 flex-col rounded-xl border border-border/70 bg-surface p-[var(--density-card-padding)] transition-colors hover:bg-accent-cream/20 ${
        isEmpty ? "opacity-90" : ""
      }`}
    >
      <Link
        href={href}
        className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        aria-label={`${title}. ${meta}`}
      />

      <div className="relative z-10 flex min-w-0 items-start gap-3 pointer-events-none">
        <Icon
          className="mt-0.5 size-4 shrink-0 text-muted"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[length:var(--density-text-h3)] font-semibold leading-snug text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-[length:var(--density-text-sm)] text-muted">
            {meta}
          </p>
          {status}
        </div>
      </div>

      {secondaryAction ? (
        <div className="relative z-20 mt-3 pointer-events-auto">
          <Link
            href={secondaryAction.href}
            className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {secondaryAction.label}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
