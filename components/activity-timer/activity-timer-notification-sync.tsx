"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useOptionalActivityTimer } from "@/components/activity-timer/activity-timer-context";
import { useActivityTimerClock } from "@/components/activity-timer/use-activity-timer-clock";
import {
  areActiveTimerNotificationsEnabled,
  clearActiveTimerNotification,
  shouldRefreshActiveTimerNotification,
  showActiveTimerNotification,
} from "@/lib/activity-timer/active-notification";

export function ActivityTimerNotificationSync() {
  const router = useRouter();
  const context = useOptionalActivityTimer();
  const activeSession = context?.activeSession ?? null;
  const clock = useActivityTimerClock(activeSession, Boolean(activeSession));
  const lastSyncedElapsedRef = useRef<number | null>(null);
  const lastSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      if (data.type === "planlet-open-timer" && typeof data.url === "string") {
        router.push(data.url);
        return;
      }

      if (data.type === "planlet-timer-stopped") {
        context?.setActiveSession(null);
        void clearActiveTimerNotification();
        router.refresh();
      }
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [context, router]);

  useEffect(() => {
    if (!activeSession || !areActiveTimerNotificationsEnabled()) {
      lastSyncedElapsedRef.current = null;
      lastSessionKeyRef.current = null;
      void clearActiveTimerNotification();
      return;
    }

    const sessionKey = `${activeSession.id}:${activeSession.pausedAt ?? "running"}`;
    const sessionChanged = lastSessionKeyRef.current !== sessionKey;
    const shouldUpdate =
      sessionChanged ||
      shouldRefreshActiveTimerNotification({
        elapsedSeconds: clock.activeElapsedSeconds,
        previousElapsedSeconds: lastSyncedElapsedRef.current,
        timerMode: activeSession.timerMode,
        targetDurationSeconds: activeSession.targetDurationSeconds,
      });

    if (!shouldUpdate) {
      return;
    }

    lastSessionKeyRef.current = sessionKey;
    lastSyncedElapsedRef.current = clock.activeElapsedSeconds;
    void showActiveTimerNotification(activeSession);
  }, [
    activeSession,
    clock.activeElapsedSeconds,
    clock.isPaused,
  ]);

  useEffect(() => {
    function syncOnBackground() {
      if (
        document.visibilityState === "hidden" &&
        activeSession &&
        areActiveTimerNotificationsEnabled()
      ) {
        void showActiveTimerNotification(activeSession);
      }
    }

    document.addEventListener("visibilitychange", syncOnBackground);
    window.addEventListener("pagehide", syncOnBackground);

    return () => {
      document.removeEventListener("visibilitychange", syncOnBackground);
      window.removeEventListener("pagehide", syncOnBackground);
    };
  }, [activeSession]);

  return null;
}
