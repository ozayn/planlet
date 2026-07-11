"use client";

import { useState } from "react";

import { PlaylistSourceIcon } from "@/lib/life-lab/playlist-video-icons";
import {
  lifeLabNoteImageAlt,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";

type PlaylistVideoThumbnailProps = {
  image: ResolvedLifeLabNoteImage | null | undefined;
  title: string;
  className?: string;
};

export function PlaylistVideoThumbnail({
  image,
  title,
  className = "w-[6.5rem]",
}: PlaylistVideoThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = image && !failed;

  return (
    <div
      className={`aspect-video shrink-0 overflow-hidden rounded-md border border-border/50 bg-accent-cream/15 ${className}`}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element -- YouTube and note thumbnails use varied external hosts */
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
          className="flex h-full w-full items-center justify-center text-muted/45"
        >
          <PlaylistSourceIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
