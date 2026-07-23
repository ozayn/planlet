"use client";

import { useState, type ReactNode } from "react";

import { LifeLabArchiveMenuItem } from "@/components/life-lab/life-lab-archive-menu-item";
import { LifeLabItemMoreMenu } from "@/components/life-lab/life-lab-item-more-menu";
import { LifeLabReadingControls } from "@/components/life-lab/life-lab-reading-controls";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { LifeLabNote, LifeLabSectionId } from "@/lib/life-lab/constants";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";

type LifeLabNoteMoreMenuProps = {
  note: LifeLabNote;
  sectionId: LifeLabSectionId;
  archived?: boolean;
  children?: ReactNode;
};

export function LifeLabNoteMoreMenu({
  note,
  sectionId,
  archived = false,
  children,
}: LifeLabNoteMoreMenuProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const itemKey = buildNoteItemKey({
    sectionId,
    relativePath: note.relativePath,
    slug: note.slug,
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  async function shareLink() {
    const url = window.location.href;
    const title = note.title;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fall through to clipboard copy when share is cancelled or unavailable.
      }
    }

    await copyLink();
  }

  return (
    <LifeLabItemMoreMenu>
      <LifeLabArchiveMenuItem
        itemKey={itemKey}
        section={sectionId}
        itemType={
          sectionId === "learning-dictionary" ? "dictionary-entry" : "note"
        }
        archived={archived}
        labels={{
          archive: ACTION_LABELS.archiveLifeLabNote,
          unarchive: ACTION_LABELS.unarchiveLifeLabNote,
        }}
      />
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/60"
        onClick={() => void shareLink()}
      >
        Share
      </button>
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/60"
        onClick={() => void copyLink()}
      >
        {copyStatus ?? "Copy link"}
      </button>
      <div
        className="border-t border-border-soft px-2 py-2"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="px-1 pb-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
          Reading
        </p>
        <LifeLabReadingControls variant="panel" />
      </div>
      <div
        className="border-t border-border-soft px-2 py-2"
        onClick={(event) => event.stopPropagation()}
      >
        <LifeLabRefreshButton
          scope="note"
          sectionId={sectionId}
          slug={note.slug}
          fileId={note.fileId}
          metadata={note.metadata}
          relativePath={note.relativePath}
          subfolderLabel={note.subfolderLabel}
          compact
        />
      </div>
      {children}
    </LifeLabItemMoreMenu>
  );
}
