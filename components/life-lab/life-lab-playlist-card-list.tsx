"use client";

import { LifeLabCollectionRow } from "@/components/life-lab/life-lab-collection-row";
import { LifeLabSectionHeading } from "@/components/life-lab/life-lab-section-heading";
import { formatPlaylistCollectionMetadata } from "@/lib/life-lab/collection-metadata";
import type { LifeLabPlaylistCard } from "@/lib/life-lab/section-view";

type LifeLabPlaylistCardListProps = {
  items: LifeLabPlaylistCard[];
};

export function LifeLabPlaylistCardList({ items }: LifeLabPlaylistCardListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <LifeLabSectionHeading>Playlists</LifeLabSectionHeading>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const metadata = formatPlaylistCollectionMetadata(item);

          return (
            <LifeLabCollectionRow
              key={item.slug}
              type="playlist"
              href={item.href}
              title={item.title}
              image={item.thumbnail}
              primaryMeta={metadata.primaryMeta}
              secondaryMeta={metadata.secondaryMeta}
            />
          );
        })}
      </ul>
    </section>
  );
}
