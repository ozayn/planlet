"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import type { LifeLabPlaylistCard } from "@/lib/life-lab/section-view";
import {
  lifeLabNoteImageAlt,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";

type LifeLabPlaylistCardListProps = {
  items: LifeLabPlaylistCard[];
};

function PlaylistCardThumbnail({
  image,
  title,
}: {
  image: ResolvedLifeLabNoteImage | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return null;
  }

  return (
    <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-border/50 bg-accent-cream/15 sm:w-32">
      {/* eslint-disable-next-line @next/next/no-img-element -- external representative URLs vary by note */}
      <img
        src={image.url}
        alt={lifeLabNoteImageAlt(image, {
          fallbackTitle: title,
          isYoutubeThumbnail: image.kind === "youtube_thumbnail",
        })}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

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
        <PlaylistCardThumbnail image={item.thumbnail} title={item.title} />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {item.title}
            </h3>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-muted/50 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-muted">{metadata || null}</p>
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
