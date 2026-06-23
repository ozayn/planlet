"use client";

import { useEffect, useState } from "react";

import { getUserInitials } from "@/lib/user-display";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  xs: "h-7 w-7 text-[0.625rem]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

type ImageLoadState = "idle" | "loaded" | "failed";

function isValidImageUrl(image?: string | null): boolean {
  const trimmed = image?.trim();
  if (!trimmed) {
    return false;
  }

  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [imageState, setImageState] = useState<ImageLoadState>("idle");
  const initials = getUserInitials(name, email);
  const sizeClass = sizeClasses[size];
  const imageUrl = image?.trim() ?? "";
  const canLoadImage = isValidImageUrl(imageUrl);
  const showPhoto = canLoadImage && imageState === "loaded";

  useEffect(() => {
    setImageState("idle");
  }, [imageUrl]);

  return (
    <span
      className={`${sizeClass} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-soft bg-accent-cream ${className}`.trim()}
    >
      <span
        aria-hidden={showPhoto ? true : undefined}
        className={`flex h-full w-full items-center justify-center font-medium text-muted ${
          showPhoto ? "invisible" : ""
        }`}
      >
        {initials}
      </span>
      {canLoadImage && imageState !== "failed" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          className={
            showPhoto
              ? "absolute inset-0 h-full w-full object-cover"
              : "absolute h-0 w-0 opacity-0"
          }
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("failed")}
        />
      ) : null}
    </span>
  );
}
