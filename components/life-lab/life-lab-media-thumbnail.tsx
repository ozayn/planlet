"use client";

import { ListVideo, Play } from "lucide-react";
import { useState } from "react";

import {
  lifeLabNoteImageAlt,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";
import { PLAYLIST_VIDEO_ICON_STROKE } from "@/lib/life-lab/playlist-video-icons";

export const LIFE_LAB_THUMBNAIL_CLASS =
  "aspect-video w-[5.75rem] shrink-0 sm:w-24";

type LifeLabMediaThumbnailProps = {
  image: ResolvedLifeLabNoteImage | null | undefined;
  title: string;
  className?: string;
  fallbackIcon?: "play" | "list";
  showFallback?: boolean;
};

export function LifeLabMediaThumbnail({
  image,
  title,
  className = LIFE_LAB_THUMBNAIL_CLASS,
  fallbackIcon = "play",
  showFallback = true,
}: LifeLabMediaThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = image && !failed;

  if (!showImage && !showFallback) {
    return null;
  }

  const FallbackIcon = fallbackIcon === "list" ? ListVideo : Play;

  return (
    <div
      className={`overflow-hidden rounded-md border border-border/50 bg-accent-cream/15 ${className}`}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element -- external YouTube and note thumbnails use varied hosts */
        <img
          src={image.url}
          alt={lifeLabNoteImageAlt(image, {
            fallbackTitle: title,
            isYoutubeThumbnail: image.kind === "youtube_thumbnail",
            thumbnailPrefix: "Thumbnail for",
          })}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-video h-full w-full items-center justify-center text-muted/45"
        >
          <FallbackIcon
            className="h-4 w-4"
            strokeWidth={PLAYLIST_VIDEO_ICON_STROKE}
          />
        </div>
      )}
    </div>
  );
}
