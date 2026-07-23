"use client";

import { useState } from "react";

import {
  lifeLabNoteImageAlt,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";

type LifeLabNoteImageProps = {
  image: ResolvedLifeLabNoteImage;
  variant: "detail" | "thumbnail";
  className?: string;
  fallbackTitle?: string | null;
  href?: string | null;
};

export function LifeLabNoteImageFigure({
  image,
  variant,
  className,
  fallbackTitle,
  href,
}: LifeLabNoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  const alt = lifeLabNoteImageAlt(image, {
    fallbackTitle,
    isYoutubeThumbnail: image.kind === "youtube_thumbnail",
  });

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

  const media = (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-accent-cream/10">
      {/* eslint-disable-next-line @next/next/no-img-element -- external representative URLs vary by note */}
      <img
        src={image.url}
        alt={alt}
        width={1280}
        height={720}
        sizes="(max-width: 768px) 100vw, 768px"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );

  return (
    <figure
      data-life-lab-hero-image=""
      className={`mx-auto w-full max-w-3xl ${className ?? ""}`.trim()}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open original video"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          {media}
        </a>
      ) : (
        media
      )}
    </figure>
  );
}
