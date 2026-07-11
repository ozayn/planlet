"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LifeLabCollectionRow } from "@/components/life-lab/life-lab-collection-row";
import {
  LifeLabSectionHeading,
  LifeLabSubsectionHeading,
} from "@/components/life-lab/life-lab-section-heading";
import { LifeLabVideoRow } from "@/components/life-lab/life-lab-video-row";
import { sortLifeLabNotes } from "@/lib/life-lab/browse";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  formatChannelCollectionMetadata,
  formatSeriesCollectionMetadata,
} from "@/lib/life-lab/collection-metadata";
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

function channelGroupThumbnail(group: StandaloneChannelGroup) {
  const recentNote = sortLifeLabNotes(group.notes, "recent")[0];

  return recentNote ? resolveLifeLabThumbnail(recentNote) : null;
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
  const [showAllIndividual, setShowAllIndividual] = useState(false);

  if (totalCount === 0) {
    return null;
  }

  const activeSeries = activeSeriesFilter
    ? seriesGroups.find((series) => series.slug === activeSeriesFilter) ??
      seriesGroups[0]
    : null;

  if (activeSeriesFilter && activeSeries) {
    const seriesMeta = formatSeriesCollectionMetadata(activeSeries);

    return (
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-0.5">
            <LifeLabSectionHeading>{activeSeries.title}</LifeLabSectionHeading>
            {seriesMeta.primaryMeta ? (
              <p className="text-sm text-muted">{seriesMeta.primaryMeta}</p>
            ) : null}
            {seriesMeta.secondaryMeta ? (
              <p className="text-sm text-muted-light">{seriesMeta.secondaryMeta}</p>
            ) : null}
          </div>
          <Link
            href={buildSeriesHref(pathname, searchParams, null)}
            className="shrink-0 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            All series
          </Link>
        </div>
        <ul className="space-y-0.5">
          {individualNotes.map((note) => (
            <LifeLabVideoRow key={note.slug} sectionId={sectionId} note={note} />
          ))}
        </ul>
      </section>
    );
  }

  const activeChannel = activeChannelFilter
    ? channelGroups.find((group) => group.slug === activeChannelFilter) ??
      channelGroups[0]
    : null;

  if (activeChannelFilter && activeChannel) {
    const channelMeta = formatChannelCollectionMetadata(activeChannel);

    return (
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-0.5">
            <LifeLabSectionHeading>{activeChannel.label}</LifeLabSectionHeading>
            {channelMeta.primaryMeta ? (
              <p className="text-sm text-muted">{channelMeta.primaryMeta}</p>
            ) : null}
            {channelMeta.secondaryMeta ? (
              <p className="text-sm text-muted-light">{channelMeta.secondaryMeta}</p>
            ) : null}
          </div>
          <Link
            href={buildChannelHref(pathname, searchParams, null)}
            className="shrink-0 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            All channels
          </Link>
        </div>
        <ul className="space-y-0.5">
          {activeChannel.notes.map((note) => (
            <LifeLabVideoRow key={note.slug} sectionId={sectionId} note={note} />
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
  const visibleIndividualNotes =
    showAllIndividual ? individualNotes : previewIndividualNotes;
  const hiddenIndividualCount = totalIndividualCount - previewIndividualNotes.length;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <LifeLabSectionHeading>Standalone videos</LifeLabSectionHeading>
        <p className="text-sm text-muted-light">
          Videos not currently assigned to a playlist.
        </p>
      </div>

      {visibleSeriesGroups.length > 0 ? (
        <div className="space-y-2">
          <LifeLabSubsectionHeading className="px-1">Series</LifeLabSubsectionHeading>
          <ul className="space-y-0.5">
            {visibleSeriesGroups.map((series) => {
              const metadata = formatSeriesCollectionMetadata(series);

              return (
                <LifeLabCollectionRow
                  key={series.id}
                  type="series"
                  href={buildSeriesHref(pathname, searchParams, series.slug)}
                  title={series.title}
                  image={series.thumbnail}
                  primaryMeta={metadata.primaryMeta}
                  secondaryMeta={metadata.secondaryMeta}
                />
              );
            })}
          </ul>
          {!activeSeriesFilter && hiddenSeriesCount > 0 && !showAllSeries ? (
            <button
              type="button"
              onClick={() => setShowAllSeries(true)}
              className="px-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              View all series
            </button>
          ) : !activeSeriesFilter && showAllSeries && hiddenSeriesCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllSeries(false)}
              className="px-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Show fewer series
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleChannelGroups.length > 0 ? (
        <div className="space-y-2">
          <LifeLabSubsectionHeading className="px-1">Channels</LifeLabSubsectionHeading>
          <ul className="space-y-0.5">
            {visibleChannelGroups.map((group) => {
              const metadata = formatChannelCollectionMetadata(group);

              return (
                <LifeLabCollectionRow
                  key={group.slug}
                  type="channel"
                  href={buildChannelHref(pathname, searchParams, group.slug)}
                  title={group.label}
                  image={channelGroupThumbnail(group)}
                  primaryMeta={metadata.primaryMeta}
                  secondaryMeta={metadata.secondaryMeta}
                />
              );
            })}
          </ul>
          {!activeChannelFilter && hiddenChannelCount > 0 && !showAllChannels ? (
            <button
              type="button"
              onClick={() => setShowAllChannels(true)}
              className="px-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              View all channels
            </button>
          ) : !activeChannelFilter && showAllChannels && hiddenChannelCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllChannels(false)}
              className="px-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Show fewer channels
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleIndividualNotes.length > 0 ? (
        <div className="space-y-2">
          <LifeLabSubsectionHeading className="px-1">
            Individual videos
          </LifeLabSubsectionHeading>
          <ul className="space-y-0.5">
            {visibleIndividualNotes.map((note) => (
              <LifeLabVideoRow key={note.slug} sectionId={sectionId} note={note} />
            ))}
          </ul>
          {hiddenIndividualCount > 0 && !showAllIndividual ? (
            <button
              type="button"
              onClick={() => setShowAllIndividual(true)}
              className="px-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              View all standalone videos
            </button>
          ) : hiddenIndividualCount > 0 && showAllIndividual ? (
            <button
              type="button"
              onClick={() => setShowAllIndividual(false)}
              className="px-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Show fewer videos
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
