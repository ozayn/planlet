"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LifeLabMediaThumbnail } from "@/components/life-lab/life-lab-media-thumbnail";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import { resolveLifeLabThumbnail } from "@/lib/life-lab/thumbnail";
import type { StandaloneChannelGroup } from "@/lib/life-lab/standalone-channel";

type LifeLabStandaloneVideosProps = {
  sectionId: LifeLabSectionId;
  channelGroups: StandaloneChannelGroup[];
  previewChannelGroups: StandaloneChannelGroup[];
  totalChannelCount: number;
  totalCount: number;
  activeChannelFilter: string | null;
};

function buildChannelHref(
  pathname: string,
  searchParams: URLSearchParams,
  channelSlug: string | null,
): string {
  const params = new URLSearchParams(searchParams.toString());

  if (channelSlug) {
    params.set("channel", channelSlug);
  } else {
    params.delete("channel");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function StandaloneVideoRow({
  sectionId,
  note,
}: {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
}) {
  const thumbnail = resolveLifeLabThumbnail(note);
  const dateLabel = note.dateLabel ?? note.modifiedAtLabel;

  return (
    <li>
      <Link
        href={`/life-lab/${sectionId}/${note.slug}`}
        className="group flex items-start gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <LifeLabMediaThumbnail image={thumbnail} title={note.title} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground md:line-clamp-1">
            {note.title}
          </p>
          {dateLabel ? (
            <p className="mt-0.5 text-xs text-muted-light">{dateLabel}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function ChannelGroupSection({
  sectionId,
  group,
  pathname,
  searchParams,
  showChannelLink,
}: {
  sectionId: LifeLabSectionId;
  group: StandaloneChannelGroup;
  pathname: string;
  searchParams: URLSearchParams;
  showChannelLink: boolean;
}) {
  const visibleNotes = group.previewNotes;
  const hiddenCount = group.totalCount - visibleNotes.length;
  const channelHref = buildChannelHref(pathname, searchParams, group.slug);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        {showChannelLink ? (
          <Link
            href={channelHref}
            className="min-w-0 text-sm font-medium text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <span className="line-clamp-1">
              {group.label}
              <span className="text-muted"> · {group.totalCount}</span>
            </span>
          </Link>
        ) : (
          <h3 className="min-w-0 text-sm font-medium text-foreground">
            <span className="line-clamp-1">
              {group.label}
              <span className="text-muted"> · {group.totalCount}</span>
            </span>
          </h3>
        )}
      </div>
      <ul className="space-y-1">
        {visibleNotes.map((note) => (
          <StandaloneVideoRow key={note.slug} sectionId={sectionId} note={note} />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <Link
          href={channelHref}
          className="inline-flex px-1 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          View all {group.totalCount} videos
        </Link>
      ) : null}
    </div>
  );
}

export function LifeLabStandaloneVideos({
  sectionId,
  channelGroups,
  previewChannelGroups,
  totalChannelCount,
  totalCount,
  activeChannelFilter,
}: LifeLabStandaloneVideosProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAllChannels, setShowAllChannels] = useState(false);

  if (totalCount === 0) {
    return null;
  }

  const visibleGroups =
    activeChannelFilter || showAllChannels
      ? channelGroups
      : previewChannelGroups;
  const hiddenChannelCount = totalChannelCount - previewChannelGroups.length;

  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-muted">Standalone videos</h2>
          {activeChannelFilter ? (
            <Link
              href={buildChannelHref(pathname, searchParams, null)}
              className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              All channels
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-muted-light">
          Videos not currently assigned to a playlist.
        </p>
      </div>
      <div className="space-y-4">
        {visibleGroups.map((group) => (
          <ChannelGroupSection
            key={group.slug}
            sectionId={sectionId}
            group={group}
            pathname={pathname}
            searchParams={searchParams}
            showChannelLink={!activeChannelFilter}
          />
        ))}
      </div>
      {!activeChannelFilter && hiddenChannelCount > 0 && !showAllChannels ? (
        <button
          type="button"
          onClick={() => setShowAllChannels(true)}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          View all channels
        </button>
      ) : !activeChannelFilter && showAllChannels && hiddenChannelCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAllChannels(false)}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          Show fewer channels
        </button>
      ) : null}
    </section>
  );
}
