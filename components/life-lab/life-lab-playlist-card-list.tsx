"use client";

import Link from "next/link";
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
  const showImage = image && !failed;

  return (
    <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-border/50 bg-accent-cream/15 sm:w-36 md:w-40">
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element -- external representative URLs vary by note */
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
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center text-muted/50"
        >
          <PlaylistPlaceholderIcon className="h-7 w-7" />
        </div>
      )}
    </div>
  );
}

function PlaylistPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5z" strokeLinejoin="round" />
    </svg>
  );
}

function PlaylistCardChevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlaylistCard({ item }: { item: LifeLabPlaylistCard }) {
  return (
    <li>
      <Link
        href={item.href}
        className="group block rounded-xl border border-border/70 bg-surface/80 p-3 transition-[background-color,box-shadow,border-color] hover:border-border hover:bg-accent-cream/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <PlaylistCardThumbnail image={item.thumbnail} title={item.title} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-snug text-foreground">
                {item.title}
              </h3>
              <PlaylistCardChevron />
            </div>
            <p className="text-sm text-muted">
              {item.unavailableLabel
                ? item.unavailableLabel
                : `${item.noteCount} ${item.noteCount === 1 ? "note" : "notes"}`}
            </p>
            {item.progressSummary ? (
              <p className="text-xs text-muted-light">{item.progressSummary}</p>
            ) : null}
            {item.lastUpdatedLabel ? (
              <p className="text-xs text-muted-light">
                Last updated {item.lastUpdatedLabel}
              </p>
            ) : null}
            {item.dev ? (
              <p className="font-mono text-[10px] leading-relaxed text-muted/80">
                collection: {item.dev.resolvedFolderPath ?? "unresolved"} ·
                files={item.dev.recursiveFilesFound} · excluded=
                {item.dev.excludedMetadataFiles.length}
              </p>
            ) : null}
          </div>
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
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted">Playlists</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <PlaylistCard key={item.slug} item={item} />
        ))}
      </ul>
    </section>
  );
}
