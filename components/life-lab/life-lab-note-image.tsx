"use client";

import { useState } from "react";

import type { LifeLabNoteImage } from "@/lib/life-lab/constants";
import {
  buildLifeLabImageCaption,
  lifeLabNoteImageAlt,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";

type LifeLabNoteImageProps = {
  image: ResolvedLifeLabNoteImage;
  variant: "detail" | "thumbnail";
  className?: string;
  fallbackTitle?: string | null;
};

export function LifeLabNoteImageFigure({
  image,
  variant,
  className,
  fallbackTitle,
}: LifeLabNoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  const alt = lifeLabNoteImageAlt(image, {
    fallbackTitle,
    isYoutubeThumbnail: image.kind === "youtube_thumbnail",
  });
  const caption = variant === "detail" ? buildLifeLabImageCaption(image) : null;

  if (variant === "thumbnail") {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-md border border-border/50 bg-accent-cream/20 ${
          className ?? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- external representative URLs vary by note */}
        <img
          src={image.url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <figure className={className ?? "space-y-1"}>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-accent-cream/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- external representative URLs vary by note */}
        <img
          src={image.url}
          alt={alt}
          decoding="async"
          onError={() => setFailed(true)}
          className="mx-auto max-h-[min(38dvh,260px)] w-full object-contain"
        />
      </div>
      {caption ? (
        <figcaption className="line-clamp-1 text-[0.6875rem] leading-snug text-muted-light">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
