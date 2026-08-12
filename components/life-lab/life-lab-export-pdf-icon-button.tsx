"use client";

import { useRouter } from "next/navigation";

import { FileTextIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
import { lifeLabNotePrintHref } from "@/lib/life-lab/print-document";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LifeLabExportPdfIconButtonProps = {
  sectionId: string;
  slug: string;
  /** When true, hide on small screens (Export lives in More on mobile). */
  desktopOnly?: boolean;
};

/** Compact monochrome Export PDF control for note action rows. */
export function LifeLabExportPdfIconButton({
  sectionId,
  slug,
  desktopOnly = false,
}: LifeLabExportPdfIconButtonProps) {
  const router = useRouter();
  const label = ACTION_LABELS.exportLifeLabNotePdf;

  return (
    <button
      type="button"
      {...passwordManagerSafeControlProps}
      aria-label={label.ariaLabel}
      title={label.title}
      onClick={() => {
        router.push(lifeLabNotePrintHref({ sectionId, slug }));
      }}
      className={`ui-icon-action-quiet${desktopOnly ? " hidden sm:inline-flex" : ""}`}
      data-life-lab-export-pdf=""
    >
      <FileTextIcon className="h-4 w-4" />
      <span className="ui-tooltip-bubble" role="tooltip">
        {label.title}
      </span>
    </button>
  );
}
