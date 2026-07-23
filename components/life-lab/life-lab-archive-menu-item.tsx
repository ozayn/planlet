"use client";

import { useTransition } from "react";

import {
  archiveLifeLabItemAction,
  unarchiveLifeLabItemAction,
} from "@/app/(app)/life-lab/archive-actions";
import { useLifeLabToast } from "@/components/life-lab/life-lab-toast";
import { ArchiveIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS, type ActionLabel } from "@/lib/action-labels";
import type { LifeLabItemType } from "@/lib/life-lab/item-key";

type LifeLabArchiveMenuItemProps = {
  itemKey: string;
  section: string;
  itemType: LifeLabItemType;
  archived: boolean;
  labels?: {
    archive: ActionLabel;
    unarchive: ActionLabel;
  };
  onArchivedChange?: (archived: boolean) => void;
  className?: string;
};

export function LifeLabArchiveMenuItem({
  itemKey,
  section,
  itemType,
  archived,
  labels = {
    archive: ACTION_LABELS.archiveLifeLabItem,
    unarchive: ACTION_LABELS.unarchiveLifeLabItem,
  },
  onArchivedChange,
  className = "",
}: LifeLabArchiveMenuItemProps) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useLifeLabToast();
  const label = archived ? labels.unarchive : labels.archive;

  function handleClick() {
    const nextArchived = !archived;
    onArchivedChange?.(nextArchived);

    startTransition(async () => {
      const result = nextArchived
        ? await archiveLifeLabItemAction({ itemKey, section, itemType })
        : await unarchiveLifeLabItemAction({ itemKey, section });

      if (!result.success) {
        onArchivedChange?.(archived);
        showToast(result.error);
        return;
      }

      if (nextArchived) {
        showToast("Archived", {
          label: "Undo",
          onClick: () => {
            onArchivedChange?.(false);
            startTransition(async () => {
              const undo = await unarchiveLifeLabItemAction({
                itemKey,
                section,
              });
              if (!undo.success) {
                onArchivedChange?.(true);
                showToast(undo.error);
              }
            });
          },
        });
      } else {
        showToast("Restored");
      }
    });
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={pending}
      aria-label={label.ariaLabel}
      title={label.title}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/40 disabled:opacity-60 ${className}`.trim()}
      onClick={handleClick}
    >
      <ArchiveIcon className="h-4 w-4 shrink-0 text-muted" />
      <span>{label.title}</span>
    </button>
  );
}
