"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { LifeLabMediaThumbnail } from "@/components/life-lab/life-lab-media-thumbnail";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import type { StandaloneChannelGroup } from "@/lib/life-lab/standalone-channel";
import type { StandaloneVideoSeries } from "@/lib/life-lab/standalone-series";
import { resolveLifeLabThumbnail } from "@/lib/life-lab/thumbnail";

type LifeLabStandaloneVideosProps = {
  sectionId: LifeLabSectionId;
  seriesGroups: StandaloneVideoSeries[];
  previewSeriesGroups: StandaloneVideoSeries[];
  channelGroups: StandaloneChannelGroup[];
  previewChannelGroups: StandaloneChannelGroup[];
  individualNotes: LifeLabNoteSummary[];
  previewIndividualNotes: LifeLabNoteSummary[];
  totalSeriesCount: number;
  totalChannelCount: number;
  totalIndividualCount: number;
  totalCount: number;
  activeChannelFilter: string | null;
  activeSeriesFilter: string | null;
};

function buildChannelHref(
  pathname: string,
  searchParams: URLSearchParams,
  channelSlug: string | null,
): string {
  const params = new URLSearchParams(searchParams.toString());

  if (channelSlug) {
    params.set("channel", channelSlug);
    params.delete("series");
  } else {
    params.delete("channel");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildSeriesHref(
  pathname: string,
  searchParams: URLSearchParams,
  seriesSlug: string | null,
): string {
  const params = new URLSearchParams(searchParams.toString());

  if (seriesSlug) {
    params.set("series", seriesSlug);
    params.delete("channel");
  } else {
    params.delete("series");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function seriesCardMetadata(series: StandaloneVideoSeries): string {
  const parts: string[] = [];

  if (series.channel) {
    parts.push(series.channel);
  }

  parts.push(
    `${series.videos.length} ${series.videos.length === 1 ? "video" : "videos"}`,
  );

  if (series.lastUpdatedLabel) {
    parts.push(`Updated ${series.lastUpdatedLabel}`);
  }

  return parts.join(" · ");
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

function SeriesCard({
  sectionId,
  series,
  pathname,
  searchParams,
}: {
  sectionId: LifeLabSectionId;
  series: StandaloneVideoSeries;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const metadata = seriesCardMetadata(series);

  return (
    <li>
      <Link
        href={buildSeriesHref(pathname, searchParams, series.slug)}
        className="group flex items-start gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <LifeLabMediaThumbnail
          image={series.thumbnail}
          title={series.title}
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {series.title}
          </p>
          {metadata ? (
            <p className="text-xs text-muted">{metadata}</p>
          ) : null}
        </div>
        <ChevronRight
          className="mt-0.5 size-4 shrink-0 text-muted transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
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
  seriesGroups,
  previewSeriesGroups,
  channelGroups,
  previewChannelGroups,
  individualNotes,
  previewIndividualNotes,
  totalSeriesCount,
  totalChannelCount,
  totalIndividualCount,
  totalCount,
  activeChannelFilter,
  activeSeriesFilter,
}: LifeLabStandaloneVideosProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAllChannels, setShowAllChannels] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);

  if (totalCount === 0) {
    return null;
  }

  const activeSeries = activeSeriesFilter
    ? seriesGroups.find((series) => series.slug === activeSeriesFilter) ??
      seriesGroups[0]
    : null;

  if (activeSeriesFilter && activeSeries) {
    return (
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-muted">{activeSeries.title}</h2>
            <p className="text-xs text-muted-light">
              {seriesCardMetadata(activeSeries)}
            </p>
          </div>
          <Link
            href={buildSeriesHref(pathname, searchParams, null)}
            className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            All series
          </Link>
        </div>
        <ul className="space-y-1">
          {individualNotes.map((note) => (
            <StandaloneVideoRow key={note.slug} sectionId={sectionId} note={note} />
          ))}
        </ul>
      </section>
    );
  }

  const visibleSeriesGroups =
    activeSeriesFilter || showAllSeries ? seriesGroups : previewSeriesGroups;
  const hiddenSeriesCount = totalSeriesCount - previewSeriesGroups.length;
  const visibleChannelGroups =
    activeChannelFilter || showAllChannels ? channelGroups : previewChannelGroups;
  const hiddenChannelCount = totalChannelCount - previewChannelGroups.length;

  return (
    <section className="space-y-4">
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

      {visibleSeriesGroups.length > 0 ? (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-light">
            Series
          </h3>
          <ul className="space-y-1">
            {visibleSeriesGroups.map((series) => (
              <SeriesCard
                key={series.id}
                sectionId={sectionId}
                series={series}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}
          </ul>
          {!activeSeriesFilter && hiddenSeriesCount > 0 && !showAllSeries ? (
            <button
              type="button"
              onClick={() => setShowAllSeries(true)}
              className="px-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              View all series
            </button>
          ) : !activeSeriesFilter && showAllSeries && hiddenSeriesCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllSeries(false)}
              className="px-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Show fewer series
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleChannelGroups.length > 0 ? (
        <div className="space-y-3">
          <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-light">
            Channels
          </h3>
          <div className="space-y-4">
            {visibleChannelGroups.map((group) => (
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
        </div>
      ) : null}

      {previewIndividualNotes.length > 0 ? (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-light">
            Individual videos
          </h3>
          <ul className="space-y-1">
            {previewIndividualNotes.map((note) => (
              <StandaloneVideoRow key={note.slug} sectionId={sectionId} note={note} />
            ))}
          </ul>
          {totalIndividualCount > previewIndividualNotes.length ? (
            <p className="px-1 text-xs text-muted-light">
              {totalIndividualCount - previewIndividualNotes.length} more not shown
              here.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
