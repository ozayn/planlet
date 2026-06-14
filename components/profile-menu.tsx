"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";

type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  canGiveFeedback?: boolean;
  canUseTherapyThoughts?: boolean;
  signOutButton: React.ReactNode;
  compact?: boolean;
  showThemeInMenu?: boolean;
};

export function ProfileMenu({
  name,
  email,
  image,
  isAdmin = false,
  canGiveFeedback = false,
  canUseTherapyThoughts = false,
  signOutButton,
  compact = false,
  showThemeInMenu = false,
}: ProfileMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const onFeedback = pathname === "/feedback" || pathname.startsWith("/feedback/");
  const onAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const onTherapyThoughts =
    pathname === "/therapy-thoughts" ||
    pathname.startsWith("/therapy-thoughts/");
  const feedbackHref =
    pathname && pathname !== "/feedback"
      ? `/feedback?from=${encodeURIComponent(pathname)}`
      : "/feedback";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const displayName = name?.trim() || email?.trim() || "Account";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center rounded-full border border-border bg-surface text-sm transition-colors hover:bg-accent-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
          compact
            ? "min-h-11 min-w-11 justify-center overflow-hidden p-0"
            : "gap-2 py-1 ps-1 pe-3"
        }`}
        aria-label={compact ? "Open profile menu" : undefined}
      >
        <UserAvatar
          name={name}
          email={email}
          image={image}
          size={compact ? "md" : "sm"}
        />
        {compact ? null : (
          <span className="max-w-28 truncate font-medium text-foreground" dir="auto">
            {displayName}
          </span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-[70] mt-2 w-64 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border-soft bg-surface p-2 ui-shadow-elevated"
        >
          <div className="border-b border-border-soft px-3 py-3">
            <div className="flex items-center gap-3">
              <UserAvatar name={name} email={email} image={image} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground" dir="auto">
                  {name?.trim() || "Signed in"}
                </p>
                {email ? (
                  <p className="truncate text-xs text-muted" dir="auto">
                    {email}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-1 p-1">
            {showThemeInMenu ? (
              <div
                role="menuitem"
                className="flex min-h-10 items-center justify-between gap-3 rounded-xl px-3"
              >
                <span className="text-sm text-foreground">Appearance</span>
                <ThemeToggle variant="compact" />
              </div>
            ) : null}
            <Link
              href="/settings"
              role="menuitem"
              aria-current={onSettings ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`flex min-h-10 items-center rounded-xl px-3 text-sm transition-colors hover:bg-accent-cream ${
                onSettings
                  ? "bg-accent-cream/60 font-medium text-foreground"
                  : "text-foreground"
              }`}
            >
              Settings
            </Link>
            {canGiveFeedback ? (
              <Link
                href={feedbackHref}
                role="menuitem"
                aria-current={onFeedback ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex min-h-10 items-center rounded-xl px-3 text-sm transition-colors hover:bg-accent-cream ${
                  onFeedback
                    ? "bg-accent-cream/60 font-medium text-foreground"
                    : "text-foreground"
                }`}
              >
                Feedback
              </Link>
            ) : null}
            {canUseTherapyThoughts ? (
              <Link
                href="/therapy-thoughts"
                role="menuitem"
                aria-current={onTherapyThoughts ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex min-h-10 items-center rounded-xl px-3 text-sm transition-colors hover:bg-accent-cream ${
                  onTherapyThoughts
                    ? "bg-accent-cream/60 font-medium text-foreground"
                    : "text-foreground"
                }`}
              >
                Therapy thoughts
              </Link>
            ) : null}
            {isAdmin ? (
              <Link
                href="/admin"
                role="menuitem"
                aria-current={onAdmin ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex min-h-10 items-center rounded-xl px-3 text-sm transition-colors hover:bg-accent-cream ${
                  onAdmin
                    ? "bg-accent-cream/60 font-medium text-foreground"
                    : "text-foreground"
                }`}
              >
                Admin
              </Link>
            ) : null}
            <div role="menuitem" className="px-1">
              <div className="[&_button]:w-full [&_button]:justify-start">
                {signOutButton}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
