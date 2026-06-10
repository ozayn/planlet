"use client";

import { useState } from "react";

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

function getAvatarLabel(name?: string | null, email?: string | null): string {
  return name?.trim() || email?.trim() || "User";
}

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getUserInitials(name, email);
  const label = getAvatarLabel(name, email);
  const sizeClass = sizeClasses[size];
  const showImage = Boolean(image?.trim()) && !imageFailed;

  return (
    <span
      className={`${sizeClass} relative inline-flex shrink-0 overflow-hidden rounded-full border border-border-soft bg-accent-cream ${className}`.trim()}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!.trim()}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          role="img"
          aria-label={label}
          className="flex h-full w-full items-center justify-center font-medium text-muted"
        >
          {initials}
        </span>
      )}
    </span>
  );
}
