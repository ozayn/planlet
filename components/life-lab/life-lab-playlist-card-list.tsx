import Link from "next/link";

import type { LifeLabPlaylistCard } from "@/lib/life-lab/section-view";

type LifeLabPlaylistCardListProps = {
  items: LifeLabPlaylistCard[];
};

export function LifeLabPlaylistCardList({ items }: LifeLabPlaylistCardListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted">Playlists</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.slug}>
            <div className="rounded-xl border border-border/70 bg-surface/80 p-4 transition-colors hover:bg-accent-cream/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold leading-snug text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted">
                    {item.noteCount}{" "}
                    {item.noteCount === 1 ? "note" : "notes"}
                  </p>
                  {item.progressSummary ? (
                    <p className="text-xs text-muted-light">
                      {item.progressSummary}
                    </p>
                  ) : null}
                  {item.lastUpdatedLabel ? (
                    <p className="text-xs text-muted-light">
                      Last updated {item.lastUpdatedLabel}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 pt-0.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
                >
                  Open →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
