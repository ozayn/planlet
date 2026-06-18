"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { detectBrowserTimezoneAction } from "@/app/(app)/settings/actions";

type BrowserTimezoneDetectorProps = {
  shouldDetect: boolean;
};

export function BrowserTimezoneDetector({
  shouldDetect,
}: BrowserTimezoneDetectorProps) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (!shouldDetect || attempted.current) {
      return;
    }

    attempted.current = true;

    let timezone: string;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }

    if (!timezone?.trim()) {
      return;
    }

    void detectBrowserTimezoneAction(timezone).then((result) => {
      if (result.success && result.updated) {
        router.refresh();
      }
    });
  }, [shouldDetect, router]);

  return null;
}
