"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ThemeToggle } from "@/components/theme-toggle";
import { ExternalLinkIcon, HeartIcon } from "@/components/ui/action-icons";
import { UserAvatar } from "@/components/user-avatar";
import { canShowFeedbackInProfileMenu } from "@/lib/profile-menu";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  canGiveFeedback?: boolean;
  signOutButton: React.ReactNode;
  compact?: boolean;
  showThemeInMenu?: boolean;
};

type ProfileMenuSectionConfig = {
  title: string;
  items: ReactNode[];
};

type ProfileMenuContentProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  scrollSections: ProfileMenuSectionConfig[];
  desktopSections: ProfileMenuSectionConfig[];
  signOutItem: ReactNode;
};

const MOBILE_PROFILE_MENU_QUERY = "(max-width: 767px)";

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

function ProfileMenuIdentity({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  return (
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
  );
}

function DesktopProfileMenuDropdown({
  menuId,
  content,
}: {
  menuId: string;
  content: ProfileMenuContentProps;
}) {
  const { name, email, image, desktopSections } = content;

  return (
    <div
      id={menuId}
      role="menu"
      aria-label="Profile menu"
      className="ui-profile-menu-desktop-dropdown p-2"
    >
      <div className="border-b border-border-soft px-3 py-3">
        <ProfileMenuIdentity name={name} email={email} image={image} />
      </div>

      <div className="p-1">
        {desktopSections.map((section) => (
          <ProfileMenuSection
            key={section.title}
            title={section.title}
            items={section.items}
          />
        ))}
      </div>
    </div>
  );
}

function MobileProfileMenuSheet({
  menuId,
  content,
  overlayRef,
  onClose,
}: {
  menuId: string;
  content: ProfileMenuContentProps;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const { name, email, image, scrollSections, signOutItem } = content;

  return (
    <div
      ref={overlayRef}
      className="ui-profile-menu-mobile-overlay"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close profile menu"
        className="ui-profile-menu-mobile-backdrop"
        onClick={onClose}
      />
      <div
        id={menuId}
        role="menu"
        aria-label="Profile menu"
        className="ui-profile-menu-mobile-panel"
      >
        <div className="ui-profile-menu-mobile-header flex items-center justify-between gap-3 px-4 py-3">
          <ProfileMenuIdentity name={name} email={email} image={image} />
          <button
            type="button"
            onClick={onClose}
            {...passwordManagerSafeControlProps}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="ui-profile-menu-mobile-body p-2">
          {scrollSections.map((section) => (
            <ProfileMenuSection
              key={section.title}
              title={section.title}
              items={section.items}
            />
          ))}
        </div>

        <div className="ui-profile-menu-mobile-footer px-3 pt-3">
          {signOutItem}
        </div>
      </div>
    </div>
  );
}

function useMobileProfileMenuLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_PROFILE_MENU_QUERY);
    const syncLayout = () => setIsMobile(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);

    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  return isMobile;
}

export function ProfileMenu({
  name,
  email,
  image,
  isAdmin = false,
  canGiveFeedback = false,
  signOutButton,
  compact = false,
  showThemeInMenu = false,
}: ProfileMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const isMobileLayout = useMobileProfileMenuLayout();

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const onFeedback = pathname === "/feedback" || pathname.startsWith("/feedback/");
  const feedbackHref =
    pathname && pathname !== "/feedback"
      ? `/feedback?from=${encodeURIComponent(pathname)}`
      : "/feedback";
  const supportUrl = process.env.NEXT_PUBLIC_STRIPE_SUPPORT_URL?.trim();

  const access = {
    canGiveFeedback,
    isAdmin,
  };

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (mobileOverlayRef.current && mobileOverlayRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
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

  useEffect(() => {
    if (!open || !isMobileLayout) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobileLayout]);

  const displayName = name?.trim() || email?.trim() || "Account";

  function closeMenu() {
    setOpen(false);
  }

  const accountItems: ReactNode[] = [
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

  const signOutItem = (
    <div className="[&_button]:ui-profile-menu-sign-out [&_form]:w-full">
      {signOutButton}
    </div>
  );

  const scrollSections: ProfileMenuSectionConfig[] = [
    { title: "Account", items: accountItems },
    { title: "Support", items: supportItems },
  ];

  const desktopSections: ProfileMenuSectionConfig[] = [
    ...scrollSections,
    {
      title: "Session",
      items: [
        <div key="sign-out" role="menuitem" className="px-0.5 pt-0.5">
          {signOutItem}
        </div>,
      ],
    },
  ];

  const menuContent: ProfileMenuContentProps = {
    name,
    email,
    image,
    scrollSections,
    desktopSections,
    signOutItem,
  };

  const mobileSheet =
    open && mounted && isMobileLayout ? (
      <MobileProfileMenuSheet
        menuId={menuId}
        content={menuContent}
        overlayRef={mobileOverlayRef}
        onClose={closeMenu}
      />
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
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

      {open && !isMobileLayout ? (
        <DesktopProfileMenuDropdown menuId={menuId} content={menuContent} />
      ) : null}

      {mobileSheet ? createPortal(mobileSheet, document.body) : null}
    </div>
  );
}
