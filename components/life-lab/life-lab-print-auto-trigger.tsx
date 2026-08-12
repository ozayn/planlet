"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { lifeLabNoteOverviewHref } from "@/lib/life-lab/print-document";

const MERMAID_READY_TIMEOUT_MS = 12_000;
const MERMAID_POLL_MS = 120;

function mermaidDiagramsReady(root: ParentNode): boolean {
  const nodes = root.querySelectorAll(".ui-mermaid");

  if (nodes.length === 0) {
    return true;
  }

  return [...nodes].every((node) => {
    if (node.getAttribute("aria-busy") === "true") {
      return false;
    }

    return Boolean(node.querySelector(".ui-mermaid-svg svg"));
  });
}

/**
 * On `?view=print`, wait for Mermaid SVG (when present), then open the browser
 * print dialog. After printing, return to the normal note view.
 */
export function LifeLabPrintAutoTrigger({
  sectionId,
  slug,
}: {
  sectionId: string;
  slug: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const overviewHref = lifeLabNoteOverviewHref({ sectionId, slug });

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    let cancelled = false;
    let printed = false;
    const startedAt = Date.now();

    function finish() {
      if (cancelled || printed) {
        return;
      }

      printed = true;
      window.print();
    }

    function onAfterPrint() {
      router.replace(overviewHref);
    }

    window.addEventListener("afterprint", onAfterPrint);

    const timer = window.setInterval(() => {
      if (cancelled) {
        return;
      }

      const ready =
        mermaidDiagramsReady(document) ||
        Date.now() - startedAt >= MERMAID_READY_TIMEOUT_MS;

      if (ready) {
        window.clearInterval(timer);
        // Allow one paint after SVG insertion before print.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(finish);
        });
      }
    }, MERMAID_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [overviewHref, router]);

  return (
    <div
      className="ui-life-lab-print-screen-bar print:hidden"
      data-life-lab-print-screen-bar=""
    >
      <p className="text-sm text-muted">Preparing a clean PDF…</p>
      <Link
        href={overviewHref}
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
      >
        Cancel
      </Link>
    </div>
  );
}
