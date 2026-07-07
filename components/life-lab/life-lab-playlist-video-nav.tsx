import Link from "next/link";

import type { PlaylistVideoNavigation } from "@/lib/life-lab/playlist-index";

type LifeLabPlaylistVideoNavProps = {
  navigation: PlaylistVideoNavigation;
  variant?: "compact" | "footer";
};

function NavButton({
  href,
  label,
  title,
  disabled,
  pending,
}: {
  href: string | null;
  label: string;
  title: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  const className =
    variantClassName(disabled, pending);

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
          {label}
        </span>
        <span className="block truncate text-sm font-medium">{title}</span>
      </Link>
    );
  }

  return (
    <span
      className={className}
      aria-disabled="true"
    >
      <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
        {label}
      </span>
      <span className="block truncate text-sm font-medium text-muted">
        {pending ? "Pending" : title}
      </span>
    </span>
  );
}

function variantClassName(disabled?: boolean, pending?: boolean): string {
  const base =
    "min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition-colors";

  if (disabled || pending) {
    return `${base} border-border/50 bg-surface/50 text-muted`;
  }

  return `${base} border-border/70 bg-surface hover:border-border hover:bg-accent-cream/30`;
}

function CompactNavButton({
  href,
  label,
  disabled,
  pending,
}: {
  href: string | null;
  label: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  const className = disabled || pending || !href
    ? "rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted"
    : "rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/50";

  if (href && !disabled && !pending) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <span className={className} aria-disabled="true">
      {pending ? `${label} · Pending` : label}
    </span>
  );
}

export function LifeLabPlaylistVideoNav({
  navigation,
  variant = "compact",
}: LifeLabPlaylistVideoNavProps) {
  const previousPending =
    navigation.previous != null &&
    (navigation.previous.status !== "processed" || !navigation.previous.href);
  const nextPending =
    navigation.next != null &&
    (navigation.next.status !== "processed" || !navigation.next.href);

  if (variant === "compact") {
    return (
      <nav
        aria-label="Playlist navigation"
        className="flex flex-wrap items-center gap-2"
      >
        {navigation.previous ? (
          <CompactNavButton
            href={navigation.previous.href}
            label="Previous"
            disabled={!navigation.previous.href}
            pending={previousPending}
          />
        ) : (
          <CompactNavButton href={null} label="Previous" disabled />
        )}
        <Link
          href={navigation.playlistIndexHref}
          className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
        >
          Back to playlist
        </Link>
        {navigation.next ? (
          <CompactNavButton
            href={navigation.next.href}
            label="Next"
            disabled={!navigation.next.href}
            pending={nextPending}
          />
        ) : (
          <CompactNavButton href={null} label="Next" disabled />
        )}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Playlist navigation"
      className="grid gap-2 sm:grid-cols-3"
    >
      {navigation.previous ? (
        <NavButton
          href={navigation.previous.href}
          label="Previous"
          title={navigation.previous.title}
          disabled={!navigation.previous.href}
          pending={previousPending}
        />
      ) : (
        <NavButton href={null} label="Previous" title="—" disabled />
      )}
      <Link
        href={navigation.playlistIndexHref}
        className="flex min-w-0 flex-col justify-center rounded-xl border border-border/70 bg-accent-cream/40 px-3 py-2.5 text-center transition-colors hover:bg-accent-cream/60"
      >
        <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
          Playlist
        </span>
        <span className="truncate text-sm font-medium">
          {navigation.playlistTitle}
        </span>
      </Link>
      {navigation.next ? (
        <NavButton
          href={navigation.next.href}
          label="Next"
          title={navigation.next.title}
          disabled={!navigation.next.href}
          pending={nextPending}
        />
      ) : (
        <NavButton href={null} label="Next" title="—" disabled />
      )}
    </nav>
  );
}
