"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PlaylistVideoNavigation } from "@/lib/life-lab/playlist-index";

type LifeLabPlaylistVideoNavProps = {
  navigation: PlaylistVideoNavigation;
  variant?: "footer" | "header-icons";
  enableKeyboardShortcuts?: boolean;
};

function isNavLinkAvailable(
  link: PlaylistVideoNavigation["previous"],
): link is NonNullable<PlaylistVideoNavigation["previous"]> & { href: string } {
  return Boolean(link?.href && link.status === "processed");
}

function NavCard({
  href,
  label,
  title,
  ariaLabel,
}: {
  href: string;
  label: string;
  title: string;
  ariaLabel: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="min-w-0 flex-1 rounded-xl border border-border/70 bg-surface px-3 py-3 transition-colors hover:border-border hover:bg-accent-cream/30"
    >
      <span className="block text-xs font-medium text-muted">{label}</span>
      <span className="mt-1 block line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {title}
      </span>
    </Link>
  );
}

function HeaderIconLink({
  href,
  ariaLabel,
  direction,
}: {
  href: string;
  ariaLabel: string;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="hidden rounded-full border border-border/70 p-2 text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground md:inline-flex"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export function LifeLabPlaylistVideoNav({
  navigation,
  variant = "footer",
  enableKeyboardShortcuts = variant === "footer",
}: LifeLabPlaylistVideoNavProps) {
  const router = useRouter();
  const previous = isNavLinkAvailable(navigation.previous)
    ? navigation.previous
    : null;
  const next = isNavLinkAvailable(navigation.next) ? navigation.next : null;

  useEffect(() => {
    if (!enableKeyboardShortcuts) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      if (event.key === "ArrowLeft" && previous?.href) {
        event.preventDefault();
        router.push(previous.href);
        return;
      }

      if (event.key === "ArrowRight" && next?.href) {
        event.preventDefault();
        router.push(next.href);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enableKeyboardShortcuts, next?.href, previous?.href, router]);

  if (variant === "header-icons") {
    if (!previous && !next) {
      return null;
    }

    return (
      <>
        {previous ? (
          <HeaderIconLink
            href={previous.href}
            ariaLabel={`Previous note: ${previous.title}`}
            direction="previous"
          />
        ) : null}
        {next ? (
          <HeaderIconLink
            href={next.href}
            ariaLabel={`Next note: ${next.title}`}
            direction="next"
          />
        ) : null}
      </>
    );
  }

  if (!previous && !next) {
    return null;
  }

  return (
    <nav aria-label="Playlist navigation" className="space-y-3">
      <div
        className={`grid gap-2 ${
          previous && next ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {previous ? (
          <NavCard
            href={previous.href}
            label="Previous"
            title={previous.title}
            ariaLabel={`Previous note: ${previous.title}`}
          />
        ) : null}
        {next ? (
          <NavCard
            href={next.href}
            label="Next"
            title={next.title}
            ariaLabel={`Next note: ${next.title}`}
          />
        ) : null}
      </div>
      <Link
        href={navigation.playlistIndexHref}
        className="inline-flex text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        Back to {navigation.playlistTitle}
      </Link>
    </nav>
  );
}
