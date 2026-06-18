"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { ExternalLinkIcon, HeartIcon } from "@/components/ui/action-icons";
import { UserAvatar } from "@/components/user-avatar";
import {
  canShowFeedbackInProfileMenu,
  canShowInsightsInProfileMenu,
  canShowTherapyReviewInProfileMenu,
} from "@/lib/profile-menu";

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

type ProfileMenuSectionConfig = {
  title: string;
  items: ReactNode[];
};

function menuItemClass(active: boolean): string {
  return `flex min-h-10 items-center rounded-xl px-3 text-sm transition-colors hover:bg-accent-cream ${
    active
      ? "bg-accent-cream/60 font-medium text-foreground"
      : "text-foreground"
  }`;
}

function ProfileMenuSection({ title, items }: ProfileMenuSectionConfig) {
  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="ui-profile-menu-section">
      <p className="ui-profile-menu-section-label">{title}</p>
      <div className="space-y-0.5">{visibleItems}</div>
    </section>
  );
}

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
  const onPlans =
    pathname === "/plans" ||
    pathname.startsWith("/plans/new") ||
    (pathname.startsWith("/plans/") &&
      !pathname.startsWith("/plans/day/") &&
      !pathname.startsWith("/plans/week/") &&
      !pathname.startsWith("/plans/month/") &&
      !pathname.startsWith("/plans/year/"));
  const onInsights =
    pathname === "/insights" || pathname.startsWith("/insights/");
  const onFeedback = pathname === "/feedback" || pathname.startsWith("/feedback/");
  const onAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const onTherapyThoughts =
    pathname === "/therapy-thoughts" ||
    pathname.startsWith("/therapy-thoughts/");
  const onTherapyReview =
    pathname === "/therapy-review" ||
    pathname.startsWith("/therapy-review/");
  const feedbackHref =
    pathname && pathname !== "/feedback"
      ? `/feedback?from=${encodeURIComponent(pathname)}`
      : "/feedback";
  const supportUrl = process.env.NEXT_PUBLIC_STRIPE_SUPPORT_URL?.trim();

  const access = {
    canGiveFeedback,
    canUseTherapyThoughts,
    isAdmin,
  };

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

  function closeMenu() {
    setOpen(false);
  }

  const planningItems: ReactNode[] = [
    <Link
      key="plans"
      href="/plans"
      role="menuitem"
      aria-current={onPlans ? "page" : undefined}
      onClick={closeMenu}
      className={menuItemClass(onPlans)}
    >
      Plans
    </Link>,
    canShowInsightsInProfileMenu() ? (
      <Link
        key="insights"
        href="/insights"
        role="menuitem"
        aria-current={onInsights ? "page" : undefined}
        onClick={closeMenu}
        className={menuItemClass(onInsights)}
      >
        Insights
      </Link>
    ) : null,
  ];

  const reflectionItems: ReactNode[] = [
    canUseTherapyThoughts ? (
      <Link
        key="therapy-thoughts"
        href="/therapy-thoughts"
        role="menuitem"
        aria-current={onTherapyThoughts ? "page" : undefined}
        onClick={closeMenu}
        className={menuItemClass(onTherapyThoughts)}
      >
        Therapy thoughts
      </Link>
    ) : null,
    canShowTherapyReviewInProfileMenu(access) ? (
      <Link
        key="therapy-review"
        href="/therapy-review"
        role="menuitem"
        aria-current={onTherapyReview ? "page" : undefined}
        onClick={closeMenu}
        className={menuItemClass(onTherapyReview)}
      >
        Therapy review
      </Link>
    ) : null,
  ];

  const appItems: ReactNode[] = [
    showThemeInMenu ? (
      <div
        key="appearance"
        role="menuitem"
        className="flex min-h-10 items-center justify-between gap-3 rounded-xl px-3"
      >
        <span className="text-sm text-foreground">Appearance</span>
        <ThemeToggle variant="compact" />
      </div>
    ) : null,
    <Link
      key="settings"
      href="/settings"
      role="menuitem"
      aria-current={onSettings ? "page" : undefined}
      onClick={closeMenu}
      className={menuItemClass(onSettings)}
    >
      Settings
    </Link>,
    canShowFeedbackInProfileMenu(access) ? (
      <Link
        key="feedback"
        href={feedbackHref}
        role="menuitem"
        aria-current={onFeedback ? "page" : undefined}
        onClick={closeMenu}
        className={menuItemClass(onFeedback)}
      >
        Feedback
      </Link>
    ) : null,
    isAdmin ? (
      <Link
        key="admin"
        href="/admin"
        role="menuitem"
        aria-current={onAdmin ? "page" : undefined}
        onClick={closeMenu}
        className={menuItemClass(onAdmin)}
      >
        Admin
      </Link>
    ) : null,
  ];

  const supportItems: ReactNode[] = supportUrl
    ? [
        <a
          key="support"
          href={supportUrl}
          role="menuitem"
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMenu}
          className={`${menuItemClass(false)} gap-2`}
        >
          <HeartIcon className="h-4 w-4 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">Support Planlet</span>
          <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-light" />
        </a>,
      ]
    : [];

  const accountItems: ReactNode[] = [
    <div key="sign-out" role="menuitem" className="px-0.5 pt-0.5">
      <div className="[&_button]:ui-profile-menu-sign-out [&_form]:w-full">
        {signOutButton}
      </div>
    </div>,
  ];

  const sections: ProfileMenuSectionConfig[] = [
    { title: "Planning", items: planningItems },
    { title: "Reflection", items: reflectionItems },
    { title: "App", items: appItems },
    { title: "Support", items: supportItems },
    { title: "Account", items: accountItems },
  ];

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

          <div className="p-1">
            {sections.map((section) => (
              <ProfileMenuSection
                key={section.title}
                title={section.title}
                items={section.items}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
