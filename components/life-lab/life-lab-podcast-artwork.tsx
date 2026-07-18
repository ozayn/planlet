"use client";

import { Mic2 } from "lucide-react";
import { useState } from "react";

import {
  lifeLabNoteImageAlt,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";

type LifeLabPodcastArtworkProps = {
  image: ResolvedLifeLabNoteImage | null | undefined;
  title: string;
  className?: string;
  eager?: boolean;
};

export function LifeLabPodcastArtwork({
  image,
  title,
  className = "size-20 sm:size-24",
  eager = false,
}: LifeLabPodcastArtworkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(image?.url) && failedUrl !== image?.url;

  return (
    <div
      className={`relative aspect-square shrink-0 overflow-hidden rounded-lg border border-border/50 bg-accent-cream/20 ${className}`}
    >
      {showImage && image ? (
        /* eslint-disable-next-line @next/next/no-img-element -- podcast artwork uses audited external CDN URLs */
        <img
          src={image.url}
          alt={lifeLabNoteImageAlt(image, { fallbackTitle: title })}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedUrl(image.url)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-muted/50"
          role="img"
          aria-label={`Podcast artwork placeholder for ${title}`}
        >
          <Mic2 className="size-1/4 min-h-5 min-w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
