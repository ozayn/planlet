"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import {
  refreshLifeLabHomeAction,
  refreshLifeLabNoteAction,
  refreshLifeLabSectionAction,
} from "@/app/(app)/life-lab/actions";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";

type LifeLabRefreshButtonProps = {
  scope: "home" | "section" | "note";
  sectionId?: LifeLabSectionId;
  slug?: string;
  fileId?: string;
  metadata?: {
    type?: string;
    playlist?: string;
    source?: string;
  };
  relativePath?: string;
  subfolderLabel?: string | null;
  className?: string;
};

export function LifeLabRefreshButton({
  scope,
  sectionId,
  slug,
  fileId,
  metadata,
  relativePath,
  subfolderLabel,
  className,
}: LifeLabRefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function handleRefresh(): void {
    startTransition(async () => {
      setStatusMessage("Refreshing…");

      let result;

      if (scope === "home") {
        result = await refreshLifeLabHomeAction();
      } else if (scope === "section" && sectionId) {
        result = await refreshLifeLabSectionAction(sectionId);
      } else if (
        scope === "note" &&
        sectionId &&
        slug &&
        fileId
      ) {
        result = await refreshLifeLabNoteAction({
          sectionId,
          slug,
          fileId,
          metadata,
          relativePath,
          subfolderLabel,
        });
      } else {
        setStatusMessage(null);
        return;
      }

      setStatusMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        aria-label="Refresh Life Lab content"
        title="Refresh"
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`size-3.5 ${isPending ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        <span>Refresh</span>
      </button>
      {statusMessage ? (
        <span className="text-xs text-muted-light" aria-live="polite">
          {statusMessage}
        </span>
      ) : null}
    </div>
  );
}
