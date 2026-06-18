"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { syncBrowserTimezoneAction } from "@/app/(app)/settings/actions";

type BrowserTimezoneDetectorProps = {
  enabled: boolean;
};

function getBrowserTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone?.trim() ? timezone : null;
  } catch {
    return null;
  }
}

export function BrowserTimezoneDetector({
  enabled,
}: BrowserTimezoneDetectorProps) {
  const router = useRouter();
  const lastSyncedTimezone = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function syncBrowserTimezone() {
      const timezone = getBrowserTimezone();
      if (!timezone || timezone === lastSyncedTimezone.current) {
        return;
      }

      void syncBrowserTimezoneAction(timezone).then((result) => {
        if (!result.success) {
          return;
        }

        lastSyncedTimezone.current = timezone;

        if (result.updated) {
          router.refresh();
        }
      });
    }

    syncBrowserTimezone();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        lastSyncedTimezone.current = null;
        syncBrowserTimezone();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, router]);

  return null;
}
