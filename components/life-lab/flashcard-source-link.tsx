import Link from "next/link";

import { getLifeLabSectionLabel } from "@/lib/life-lab/sections";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";

type FlashcardSourceLinkProps = {
  href: string | null;
  title: string | null;
  sectionId?: LifeLabSectionId | null;
  className?: string;
};

export function FlashcardSourceLink({
  href,
  title,
  sectionId,
  className = "",
}: FlashcardSourceLinkProps) {
  if (!href || !title) {
    return null;
  }

  const sectionLabel = sectionId ? getLifeLabSectionLabel(sectionId) : null;

  return (
    <p className={`text-sm text-muted ${className}`.trim()}>
      <span className="text-muted-light">From: </span>
      <Link
        href={href}
        className="font-medium text-foreground underline-offset-2 hover:underline"
        dir="auto"
      >
        {title}
      </Link>
      {sectionLabel ? (
        <span className="text-muted-light"> — {sectionLabel}</span>
      ) : null}
    </p>
  );
}
