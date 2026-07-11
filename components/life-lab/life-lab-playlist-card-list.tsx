"use client";

import Link from "next/link";

import { LifeLabMediaThumbnail } from "@/components/life-lab/life-lab-media-thumbnail";
import type { LifeLabPlaylistCard } from "@/lib/life-lab/section-view";

type LifeLabPlaylistCardListProps = {
  items: LifeLabPlaylistCard[];
};

function playlistCardMetadata(item: LifeLabPlaylistCard): string {
  const parts: string[] = [];

  if (item.noteCount != null && item.noteCount >= 0) {
    parts.push(item.notesLabel);
  }

  if (item.channelLabel) {
    parts.push(item.channelLabel);
  }

  if (item.lastUpdatedLabel) {
    parts.push(`Updated ${item.lastUpdatedLabel}`);
  }

  if (item.resolutionState === "resolved" && item.progressSummary) {
    parts.push(item.progressSummary);
  }

  return parts.filter(Boolean).join(" · ");
}

function PlaylistCard({ item }: { item: LifeLabPlaylistCard }) {
  const metadata = playlistCardMetadata(item);

  return (
    <li>
      <Link
        href={item.href}
        className="group flex items-start gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <LifeLabMediaThumbnail
          image={item.thumbnail}
          title={item.title}
          fallbackIcon="list"
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {item.title}
          </h3>
          {metadata ? (
            <p className="text-xs text-muted">{metadata}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function LifeLabPlaylistCardList({ items }: LifeLabPlaylistCardListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted">Playlists</h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <PlaylistCard key={item.slug} item={item} />
        ))}
      </ul>
    </section>
  );
}
