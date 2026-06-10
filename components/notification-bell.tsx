"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/notifications/actions";
import { APP_TIMEZONE } from "@/config/time";
import type { SerializedNotification } from "@/lib/notification-serialize";

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

export function NotificationBell({
  unreadCount,
  notifications,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
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

  function handleNotificationClick(notification: SerializedNotification) {
    startTransition(async () => {
      if (!notification.readAt) {
        await markNotificationReadAction(notification.id);
      }

      if (notification.href) {
        router.push(notification.href);
      }

      setOpen(false);
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        title="Notifications"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-accent-cream hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-blue px-1 text-[10px] font-semibold leading-none text-white">
            {formatUnreadBadge(unreadCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Notifications"
          className="absolute end-0 z-50 mt-2 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border-soft bg-surface ui-shadow-elevated"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-2">
              {notifications.map((notification) => {
                const isUnread = !notification.readAt;

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isPending}
                      onClick={() => handleNotificationClick(notification)}
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
          )}
        </div>
      ) : null}
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
