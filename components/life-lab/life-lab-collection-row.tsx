"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { LifeLabMediaThumbnail } from "@/components/life-lab/life-lab-media-thumbnail";
import { LIFE_LAB_COLLECTION_ROW_LINK_ROLE } from "@/lib/life-lab/collection-metadata";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";

export type LifeLabCollectionType = "series" | "channel" | "playlist";

type LifeLabCollectionRowProps = {
  href: string;
  title: string;
  image: ResolvedLifeLabNoteImage | null;
  primaryMeta?: string | null;
  secondaryMeta?: string | null;
  type?: LifeLabCollectionType;
  showChevron?: boolean;
};

export function LifeLabCollectionRow({
  href,
  title,
  image,
  primaryMeta,
  secondaryMeta,
  type = "channel",
  showChevron = true,
}: LifeLabCollectionRowProps) {
  const fallbackIcon = type === "playlist" ? "list" : "play";

  return (
    <li>
      <Link
        href={href}
        role={LIFE_LAB_COLLECTION_ROW_LINK_ROLE}
        className="group flex items-start gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <LifeLabMediaThumbnail
          image={image}
          title={title}
          fallbackIcon={fallbackIcon}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {title}
          </p>
          {primaryMeta ? (
            <p className="mt-0.5 text-sm text-muted">{primaryMeta}</p>
          ) : null}
          {secondaryMeta ? (
            <p className="mt-0.5 text-sm text-muted-light">{secondaryMeta}</p>
          ) : null}
        </div>
        {showChevron ? (
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-muted transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        ) : null}
      </Link>
    </li>
  );
}
