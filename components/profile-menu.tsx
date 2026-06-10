"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { UserAvatar } from "@/components/user-avatar";

type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  signOutButton: React.ReactNode;
  compact?: boolean;
};

export function ProfileMenu({
  name,
  email,
  image,
  isAdmin = false,
  signOutButton,
  compact = false,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

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
          compact ? "p-0.5" : "gap-2 py-1 ps-1 pe-3"
        }`}
        aria-label={compact ? displayName : undefined}
      >
        <UserAvatar name={name} email={email} image={image} size="sm" />
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
          className="absolute end-0 z-50 mt-2 w-64 rounded-2xl border border-border-soft bg-surface p-2 ui-shadow-elevated"
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
            {isAdmin ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center rounded-xl px-3 text-sm text-foreground transition-colors hover:bg-accent-cream"
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
