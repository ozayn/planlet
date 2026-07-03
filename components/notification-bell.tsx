"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/notifications/actions";
import { BellIcon } from "@/components/ui/action-icons";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { APP_TIMEZONE } from "@/config/time";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { SerializedNotification } from "@/lib/notification-serialize";
import { useMediaQuery } from "@/lib/use-media-query";

type NotificationBellProps = {
  unreadCount: number;
  notifications: SerializedNotification[];
};

function formatNotificationTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso));
}

function formatUnreadBadge(count: number): string {
  if (count > 9) {
    return "9+";
  }
  return String(count);
}

function NotificationList({
  notifications,
  isPending,
  onNotificationClick,
}: {
  notifications: SerializedNotification[];
  isPending: boolean;
  onNotificationClick: (notification: SerializedNotification) => void;
}) {
  if (notifications.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No notifications yet.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5 p-2">
        {notifications.map((notification) => {
          const isUnread = !notification.readAt;

          return (
            <li key={notification.id}>
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                onClick={() => onNotificationClick(notification)}
                className={`flex w-full gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-accent-cream disabled:opacity-60 ${
                  isUnread ? "bg-accent-cream/35" : ""
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isUnread ? "bg-accent-blue" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {notification.title}
                  </span>
                  {notification.body ? (
                    <span
                      className="mt-0.5 block text-sm text-muted"
                      dir="auto"
                    >
                      {notification.body}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted-light">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
  );
}

export function NotificationBell({
  unreadCount,
  notifications,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollTopRef = useRef(0);
  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    if (!open || isMobile) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) {
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
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || !isMobile) {
      return;
    }

    requestAnimationFrame(() => {
      if (listScrollRef.current) {
        listScrollRef.current.scrollTop = savedScrollTopRef.current;
      }
    });
  }, [open, isMobile]);

  function handleClose() {
    savedScrollTopRef.current = listScrollRef.current?.scrollTop ?? 0;
    setOpen(false);
  }

  function handleNotificationClick(notification: SerializedNotification) {
    startTransition(async () => {
      if (!notification.readAt) {
        await markNotificationReadAction(notification.id);
      }

      if (notification.href) {
        router.push(notification.href);
      }

      handleClose();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  }

  const markAllReadButton =
    unreadCount > 0 ? (
      <button
        type="button"
        disabled={isPending}
        onClick={handleMarkAllRead}
        className="min-h-11 px-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
      >
        Mark all read
      </button>
    ) : null;

  const panelBody = (
    <NotificationList
      notifications={notifications}
      isPending={isPending}
      onNotificationClick={handleNotificationClick}
    />
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={bellButtonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup={isMobile ? "dialog" : "menu"}
        aria-controls={isMobile ? `${menuId}-mobile` : `${menuId}-desktop`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        title={ACTION_LABELS.notifications.title}
        onClick={() => {
          if (open) {
            handleClose();
            return;
          }

          setOpen(true);
        }}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-blue px-1 text-[10px] font-semibold leading-none text-white">
            {formatUnreadBadge(unreadCount)}
          </span>
        ) : null}
      </button>

      {isMobile ? (
        <SimpleSheet
          open={open}
          onClose={handleClose}
          title="Notifications"
          headerExtra={markAllReadButton}
          bodyClassName="!px-0 !py-0"
          bodyRef={listScrollRef}
          closeLabel="Close notifications"
          backdropLabel="Close notifications"
          returnFocusRef={bellButtonRef}
        >
          <div id={`${menuId}-mobile`}>{panelBody}</div>
        </SimpleSheet>
      ) : open ? (
        <div
          id={`${menuId}-desktop`}
          role="menu"
          aria-label={ACTION_LABELS.notifications.ariaLabel}
          className="ui-desktop-dropdown-panel !w-80"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Notifications
            </h2>
            {markAllReadButton}
          </div>
          {panelBody}
        </div>
      ) : null}
    </div>
  );
}
