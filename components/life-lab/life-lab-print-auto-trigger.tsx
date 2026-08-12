"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fitLifeLabPrintDiagrams } from "@/lib/life-lab/print-diagram-fit";
import { lifeLabNoteOverviewHref } from "@/lib/life-lab/print-document";
import {
  LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS,
  capturePrintReadinessSnapshot,
  logLifeLabPrintReadiness,
  shouldProceedWithPrint,
} from "@/lib/life-lab/print-readiness";

const POLL_MS = 80;
const TITLE_RESTORE_FALLBACK_MS = 60_000;

/**
 * On `?view=print`, wait briefly for essential visuals (bounded), then
 * `window.print()`. After printing, return to the normal note view.
 */
export function LifeLabPrintAutoTrigger({
  sectionId,
  slug,
  documentTitle,
}: {
  sectionId: string;
  slug: string;
  /** Suggested Save-as-PDF filename stem via `document.title`. */
  documentTitle: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const overviewHref = lifeLabNoteOverviewHref({ sectionId, slug });
  const [status, setStatus] = useState("Preparing a clean PDF…");

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    let cancelled = false;
    let printed = false;
    let fontsReady = document.fonts?.status === "loaded";
    let previousTitle: string | null = null;
    let titleRestored = false;
    let titleRestoreTimer: number | undefined;
    const startedAt = Date.now();

    function elapsed(): number {
      return Date.now() - startedAt;
    }

    function restoreDocumentTitle() {
      if (titleRestored || previousTitle === null) {
        return;
      }

      titleRestored = true;
      document.title = previousTitle;
      previousTitle = null;
      if (titleRestoreTimer !== undefined) {
        window.clearTimeout(titleRestoreTimer);
        titleRestoreTimer = undefined;
      }
    }

    function finish(reason: string) {
      if (cancelled || printed) {
        return;
      }

      printed = true;
      const snapshot = capturePrintReadinessSnapshot(document, fontsReady);
      logLifeLabPrintReadiness({
        gate: "print",
        elapsedMs: elapsed(),
        detail: reason,
        snapshot,
      });
      setStatus("Opening print dialog…");

      try {
        fitLifeLabPrintDiagrams(document);
      } catch (error) {
        logLifeLabPrintReadiness({
          gate: "diagram-fit-error",
          elapsedMs: elapsed(),
          detail:
            error instanceof Error ? error.message : "diagram fit failed",
        });
      }

      previousTitle = document.title;
      titleRestored = false;
      document.title = documentTitle;
      titleRestoreTimer = window.setTimeout(() => {
        restoreDocumentTitle();
      }, TITLE_RESTORE_FALLBACK_MS);

      window.print();
    }

    function onAfterPrint() {
      restoreDocumentTitle();
      router.replace(overviewHref);
    }

    window.addEventListener("afterprint", onAfterPrint);

    const fontsPromise =
      document.fonts && typeof document.fonts.ready?.then === "function"
        ? document.fonts.ready.then(() => {
            fontsReady = true;
            logLifeLabPrintReadiness({
              gate: "fonts-ready",
              elapsedMs: elapsed(),
            });
          })
        : Promise.resolve().then(() => {
            fontsReady = true;
          });

    void fontsPromise.catch(() => {
      fontsReady = true;
      logLifeLabPrintReadiness({
        gate: "fonts-error",
        elapsedMs: elapsed(),
        detail: "fonts.ready rejected; continuing",
      });
    });

    logLifeLabPrintReadiness({
      gate: "start",
      elapsedMs: 0,
      snapshot: capturePrintReadinessSnapshot(document, fontsReady),
    });

    const hardStop = window.setTimeout(() => {
      if (cancelled || printed) {
        return;
      }

      logLifeLabPrintReadiness({
        gate: "hard-timeout",
        elapsedMs: elapsed(),
        snapshot: capturePrintReadinessSnapshot(document, fontsReady),
        detail: `proceeding after ${LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS}ms`,
      });
      window.requestAnimationFrame(() => finish("hard-timeout"));
    }, LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS);

    const timer = window.setInterval(() => {
      if (cancelled || printed) {
        return;
      }

      const snapshot = capturePrintReadinessSnapshot(document, fontsReady);
      const decision = shouldProceedWithPrint({
        snapshot,
        elapsedMs: elapsed(),
      });

      if (!decision.proceed) {
        return;
      }

      window.clearInterval(timer);
      window.clearTimeout(hardStop);
      logLifeLabPrintReadiness({
        gate: "ready",
        elapsedMs: elapsed(),
        detail: decision.reason,
        snapshot,
      });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => finish(decision.reason));
      });
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(hardStop);
      window.removeEventListener("afterprint", onAfterPrint);
      restoreDocumentTitle();
    };
  }, [documentTitle, overviewHref, router]);

  return (
    <div
      className="ui-life-lab-print-screen-bar print:hidden"
      data-life-lab-print-screen-bar=""
    >
      <p className="text-sm text-muted">{status}</p>
      <Link
        href={overviewHref}
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
      >
        Cancel
      </Link>
    </div>
  );
}
