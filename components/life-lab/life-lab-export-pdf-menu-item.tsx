"use client";

import { useRouter } from "next/navigation";

import { ACTION_LABELS } from "@/lib/action-labels";
import { lifeLabNotePrintHref } from "@/lib/life-lab/print-document";

type LifeLabExportPdfMenuItemProps = {
  sectionId: string;
  slug: string;
};

/** More-menu entry that opens the print/export view (browser Save as PDF). */
export function LifeLabExportPdfMenuItem({
  sectionId,
  slug,
}: LifeLabExportPdfMenuItemProps) {
  const router = useRouter();
  const label = ACTION_LABELS.exportLifeLabNotePdf;

  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/60"
      aria-label={label.ariaLabel}
      onClick={() => {
        router.push(lifeLabNotePrintHref({ sectionId, slug }));
      }}
    >
      {label.title}
    </button>
  );
}
