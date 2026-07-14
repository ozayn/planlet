"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import { LifeLabFrequencyCloud } from "@/components/life-lab/life-lab-frequency-cloud";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import { MermaidExpandDialog } from "@/components/life-lab/mermaid-expand-dialog";
import { parseFrequencyMarkdownList } from "@/lib/life-lab/frequency-cloud";
import {
  filterPlaylistCloudItems,
  type PlaylistCloudFilterType,
} from "@/lib/life-lab/playlist-cloud-filter";
import type {
  LifeLabCacheDiagnostic,
  LifeLabNoteDevMeta,
  LifeLabNoteLoadMeta,
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { canViewLifeLabTechnicalDebug, isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import {
  collapsedArtifactLabel,
  extractMarkdownSection,
  prepareArtifactBodyForDisplay,
  preparePlaylistSummaryForDisplay,
} from "@/lib/life-lab/playlist-artifact-content";
import type {
  PlaylistAssetDiagnostic,
  PlaylistAssetId,
  PlaylistAssetView,
  PlaylistAssetsBundle,
} from "@/lib/life-lab/playlist-assets";
import {
  formatClusterRowMetadata,
  resolveClusterFileForRow,
  type PlaylistClusterFile,
  type PlaylistClusterRow,
} from "@/lib/life-lab/playlist-clusters";
import { resolveRecentVideosFromMarkdown } from "@/lib/life-lab/playlist-recent-videos";
import type { PlaylistVideoRow } from "@/lib/life-lab/playlist-index";

type PlaylistAssetsSectionProps = {
  bundle: PlaylistAssetsBundle;
  fromCache?: boolean;
  sectionId: LifeLabSectionId;
  videos: PlaylistVideoRow[];
  relatedNotes: LifeLabNoteSummary[];
  playlistTitle: string;
  channelName?: string | null;
  metadata?: LifeLabNoteMetadata;
};

function QuietUnavailable({ title }: { title: string }) {
  return (
    <p className="text-xs text-muted-light">
      {title} is unavailable right now.
    </p>
  );
}

export function PlaylistSummarySection({
  asset,
  availableAssetIds = new Set<PlaylistAssetId>(),
}: {
  asset: PlaylistAssetView;
  availableAssetIds?: Set<PlaylistAssetId>;
}) {
  if (asset.unavailable) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Playlist summary</h2>
        <QuietUnavailable title="Playlist summary" />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Playlist summary</h2>
      <MarkdownContent
        content={preparePlaylistSummaryForDisplay(asset, availableAssetIds)}
      />
    </section>
  );
}

function LearningMapSection({
  asset,
}: {
  asset: PlaylistAssetView;
}) {
  if (asset.unavailable) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Learning Map</h3>
        <QuietUnavailable title="Learning Map" />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Learning Map</h3>
      <div className="min-w-0 max-w-full overflow-x-auto">
        <MarkdownContent content={prepareArtifactBodyForDisplay(asset)} />
      </div>
    </section>
  );
}

function FrequencyCloudSection({
  asset,
  label,
  type,
  maxItems,
  minFontSize,
  maxFontSize,
  emptyMessage,
  playlistTitle,
  channelName,
  metadata,
}: {
  asset: PlaylistAssetView;
  label: string;
  type: PlaylistCloudFilterType;
  maxItems: number;
  minFontSize: number;
  maxFontSize: number;
  emptyMessage: string;
  playlistTitle: string;
  channelName?: string | null;
  metadata?: LifeLabNoteMetadata;
}) {
  if (asset.unavailable) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <QuietUnavailable title={label} />
      </section>
    );
  }

  const parsed = parseFrequencyMarkdownList(
    prepareArtifactBodyForDisplay(asset),
  );
  const filtered = filterPlaylistCloudItems({
    items: parsed,
    playlistTitle,
    channelName,
    metadata,
    type,
    maxVisible: maxItems,
  });

  if (filtered.visibleItems.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <p className="text-xs text-muted-light">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <LifeLabFrequencyCloud
        items={filtered.visibleItems.map((item) => ({
          label: item.label,
          count: item.rawCount,
          rawCount: item.rawCount,
          weight: item.adjustedWeight,
        }))}
        countItems={filtered.allItems.map((item) => ({
          label: item.label,
          count: item.rawCount,
        }))}
        ariaLabel={`${label} cloud`}
        minFontSize={minFontSize}
        maxFontSize={maxFontSize}
      />
    </section>
  );
}

function ClusterRowButton({
  row,
  clusterFile,
  onOpen,
}: {
  row: PlaylistClusterRow;
  clusterFile: PlaylistClusterFile | null;
  onOpen: () => void;
}) {
  const metadata = formatClusterRowMetadata(row);
  const unavailable = !clusterFile || clusterFile.unavailable || !clusterFile.mermaidCode;

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (!unavailable) {
            onOpen();
          }
        }}
        disabled={unavailable}
        className="group flex w-full items-start gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:cursor-default disabled:opacity-60"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium leading-snug text-foreground">
            {row.title}
          </p>
          {metadata.conceptsLine ? (
            <p className="line-clamp-2 text-sm text-muted">
              {metadata.conceptsLine}
            </p>
          ) : null}
          {metadata.countLine ? (
            <p className="text-sm text-muted-light">{metadata.countLine}</p>
          ) : null}
          {unavailable && clusterFile?.error ? (
            <p className="text-xs text-muted-light">{clusterFile.error}</p>
          ) : null}
        </div>
        {!unavailable ? (
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-muted transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        ) : null}
      </button>
    </li>
  );
}

function ConceptClustersSection({
  rows,
  clusterFiles,
}: {
  rows: PlaylistClusterRow[];
  clusterFiles: PlaylistClusterFile[];
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const activeRow = rows.find((row) => row.slug === openSlug) ?? null;
  const activeFile = activeRow
    ? resolveClusterFileForRow(activeRow, clusterFiles)
    : null;

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Concept clusters</h3>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <ClusterRowButton
            key={row.slug}
            row={row}
            clusterFile={resolveClusterFileForRow(row, clusterFiles)}
            onOpen={() => setOpenSlug(row.slug)}
          />
        ))}
      </ul>
      {activeRow ? (
        <MermaidExpandDialog
          open={Boolean(openSlug)}
          onClose={() => setOpenSlug(null)}
          code={activeFile?.mermaidCode ?? ""}
          returnFocusRef={returnFocusRef}
          title={activeRow.title}
          subtitle={
            activeFile?.unavailable || !activeFile?.mermaidCode
              ? "This cluster diagram could not be rendered."
              : undefined
          }
        />
      ) : null}
    </section>
  );
}

function RecentVideosSection({
  items,
}: {
  items: Array<{ title: string; href: string }>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Recent videos</h3>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm text-foreground transition-colors hover:bg-accent-cream/25 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <span className="min-w-0">{item.title}</span>
              <ChevronRight
                className="size-4 shrink-0 text-muted transition-colors group-hover:text-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CollapsedArtifactSection({
  asset,
  playlistId,
  label,
}: {
  asset: PlaylistAssetView;
  playlistId: string | null;
  label?: string;
}) {
  return (
    <details
      key={`${playlistId ?? "playlist"}-${asset.id}`}
      className="ui-settings-details group"
    >
      <summary className="ui-settings-details-summary">
        {label ?? collapsedArtifactLabel(asset)}
      </summary>
      <div className="ui-settings-details-body">
        {asset.unavailable ? (
          <QuietUnavailable title={asset.title} />
        ) : (
          <MarkdownContent content={prepareArtifactBodyForDisplay(asset)} />
        )}
      </div>
    </details>
  );
}

function CollapsedMarkdownSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  if (!content.trim()) {
    return null;
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">{title}</summary>
      <div className="ui-settings-details-body">
        <MarkdownContent content={content} />
      </div>
    </details>
  );
}

function PlaylistAssetDiagnosticsPanel({
  bundle,
  fromCache,
}: {
  bundle: PlaylistAssetsBundle & { cache?: LifeLabCacheDiagnostic };
  fromCache?: boolean;
}) {
  const resolvedFolder =
    bundle.folder.status === "resolved" ? bundle.folder : null;

  return (
    <div className="space-y-2">
      {resolvedFolder ? (
        <div className="rounded-lg border border-border/50 bg-surface px-3 py-2 text-xs text-muted">
          <p>
            Playlist ID:{" "}
            <span className="font-mono text-foreground">
              {resolvedFolder.playlistId}
            </span>
          </p>
          <p>Assets folder: {resolvedFolder.relativePath}</p>
          <p>Resolved via: {resolvedFolder.source}</p>
          <p>Learning map file found: {bundle.learningMapFound ? "yes" : "no"}</p>
          <p>Cluster rows: {bundle.clusterRows.length}</p>
          <p>Cluster files: {bundle.clusterFiles.length}</p>
          {bundle.learningMapSignature ? (
            <p>Map signature: {bundle.learningMapSignature}</p>
          ) : null}
        </div>
      ) : bundle.folder.status === "ambiguous" ? (
        <div className="rounded-lg border border-border/50 bg-surface px-3 py-2 text-xs text-muted">
          <p>Ambiguous asset folder resolution.</p>
          <p>{bundle.folder.diagnostic}</p>
          <p>Candidates: {bundle.folder.candidates.join(", ")}</p>
        </div>
      ) : bundle.folder.status === "unresolved" ? (
        <p className="text-xs text-muted">{bundle.folder.diagnostic}</p>
      ) : null}
      {fromCache !== undefined ? (
        <p className="text-xs text-muted">
          Bundle cache: {fromCache ? "hit" : "miss"}
        </p>
      ) : null}
      {bundle.cache ? (
        <dl className="space-y-1 text-xs text-muted">
          <div className="flex justify-between gap-3">
            <dt>Cache key</dt>
            <dd className="max-w-[60%] truncate text-end text-foreground">
              {bundle.cache.cacheKey}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Note list cache</dt>
            <dd className="text-foreground">
              {bundle.cache.noteListHit === true
                ? "hit"
                : bundle.cache.noteListHit === false
                  ? "miss"
                  : "unknown"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Drive API calls</dt>
            <dd className="text-foreground">
              {bundle.cache.driveCalls ?? 0}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Stale fallback</dt>
            <dd className="text-foreground">
              {bundle.cache.staleFallback ? "yes" : "no"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Refresh requested</dt>
            <dd className="text-foreground">
              {bundle.cache.refreshRequested ? "yes" : "no"}
            </dd>
          </div>
        </dl>
      ) : null}
      {bundle.suppressedDuplicates.length > 0 ? (
        <p className="text-xs text-muted">
          Suppressed duplicates: {bundle.suppressedDuplicates.join(", ")}
        </p>
      ) : null}
      <ul className="space-y-2 text-xs text-muted">
        {bundle.diagnostics.map((item: PlaylistAssetDiagnostic) => (
          <li
            key={item.id}
            className="rounded-lg border border-border/50 bg-surface px-3 py-2"
          >
            <p className="font-medium text-foreground">{item.id}</p>
            <p>Found: {item.found ? "yes" : "no"}</p>
            {item.relativePath ? <p>Path: {item.relativePath}</p> : null}
            {item.fileId ? <p>File ID: {item.fileId}</p> : null}
            {item.modifiedAt ? <p>Modified: {item.modifiedAt}</p> : null}
            {item.found ? (
              <p>Cache: {item.fromCache ? "hit" : "miss"}</p>
            ) : null}
            {item.error ? (
              <p className="text-muted-light">Error: {item.error}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DevInfoSection({
  dev,
  loadMeta,
}: {
  dev: LifeLabNoteDevMeta;
  loadMeta: LifeLabNoteLoadMeta;
}) {
  const rows = [
    { label: "Drive file ID", value: dev.fileId },
    { label: "Relative path", value: dev.relativePath },
    { label: "Parent folder", value: dev.parentFolder ?? "Unknown" },
    { label: "Google modified time", value: dev.modifiedAt ?? "Unknown" },
    { label: "Cached", value: loadMeta.fromCache ? "Yes" : "No" },
    { label: "Loaded at", value: loadMeta.loadedAt ?? "Unknown" },
  ];

  if (loadMeta.cache) {
    rows.push(
      { label: "Cache key", value: loadMeta.cache.cacheKey },
      {
        label: "Drive API calls",
        value: String(loadMeta.cache.driveCalls ?? 0),
      },
      {
        label: "Stale fallback",
        value: loadMeta.cache.staleFallback ? "Yes" : "No",
      },
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Developer information
      </p>
      <dl className="space-y-1 text-xs text-muted">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt>{row.label}</dt>
            <dd className="max-w-[60%] truncate text-end text-foreground" dir="auto">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const COLLAPSED_ASSET_ORDER: PlaylistAssetId[] = [
  "timeline",
  "full-concept-map",
  "topic-graph",
  "people-map",
  "concept-map",
];

export function LifeLabPlaylistAnalysis({
  bundle,
  sectionId,
  videos,
  relatedNotes,
  playlistTitle,
  channelName = null,
  metadata,
}: PlaylistAssetsSectionProps) {
  const playlistId =
    bundle.folder.status === "resolved" ? bundle.folder.playlistId : null;
  const learningMap = bundle.artifacts.find(
    (asset) => asset.id === "learning-map",
  );
  const conceptFrequencies = bundle.artifacts.find(
    (asset) => asset.id === "concept-frequencies",
  );
  const people = bundle.artifacts.find((asset) => asset.id === "people");
  const summaryAsset = bundle.artifacts.find((asset) => asset.id === "summary");
  const collapsedAssets = COLLAPSED_ASSET_ORDER.flatMap((assetId) => {
    const asset = bundle.artifacts.find((item) => item.id === assetId);

    return asset ? [asset] : [];
  });
  const showMissingLearningMap =
    bundle.folder.status === "resolved" && !bundle.learningMapFound;
  const recentVideos = summaryAsset
    ? resolveRecentVideosFromMarkdown({
        content: summaryAsset.content,
        sectionId,
        videos,
        notes: relatedNotes,
        totalVisibleVideos: videos.length,
      })
    : [];
  const questionsSection = summaryAsset
    ? extractMarkdownSection(summaryAsset.content, /^##\s+questions?\s*$/im)
    : null;

  const hasAnalysis =
    learningMap ||
    conceptFrequencies ||
    people ||
    bundle.clusterRows.length > 0 ||
    recentVideos.length > 0 ||
    questionsSection ||
    collapsedAssets.length > 0 ||
    showMissingLearningMap;

  if (!hasAnalysis) {
    return null;
  }

  return (
    <section className="space-y-5 border-t border-border/50 pt-5">
      <h2 className="text-sm font-semibold text-foreground">Playlist analysis</h2>

      {learningMap ? (
        <LearningMapSection asset={learningMap} />
      ) : showMissingLearningMap ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Learning Map</h3>
          <p className="text-xs text-muted-light">
            Learning Map not available yet.
          </p>
        </section>
      ) : null}

      {conceptFrequencies ? (
        <FrequencyCloudSection
          asset={conceptFrequencies}
          label="Concepts"
          type="concepts"
          maxItems={24}
          minFontSize={14}
          maxFontSize={30}
          emptyMessage="No concept data available yet."
          playlistTitle={playlistTitle}
          channelName={channelName}
          metadata={metadata}
        />
      ) : null}

      {people ? (
        <FrequencyCloudSection
          asset={people}
          label="People"
          type="people"
          maxItems={20}
          minFontSize={14}
          maxFontSize={26}
          emptyMessage="No people data available yet."
          playlistTitle={playlistTitle}
          channelName={channelName}
          metadata={metadata}
        />
      ) : null}

      <ConceptClustersSection
        rows={bundle.clusterRows}
        clusterFiles={bundle.clusterFiles}
      />

      <RecentVideosSection items={recentVideos} />

      {collapsedAssets.length > 0 || questionsSection ? (
        <div className="space-y-2">
          {collapsedAssets
            .filter((asset) => asset.id === "timeline")
            .map((asset) => (
              <CollapsedArtifactSection
                key={`${playlistId ?? "playlist"}-${asset.id}`}
                asset={asset}
                playlistId={playlistId}
              />
            ))}
          {questionsSection ? (
            <CollapsedMarkdownSection title="Questions" content={questionsSection} />
          ) : null}
          {collapsedAssets
            .filter((asset) => asset.id !== "timeline")
            .map((asset) => (
              <CollapsedArtifactSection
                key={`${playlistId ?? "playlist"}-${asset.id}`}
                asset={asset}
                playlistId={playlistId}
              />
            ))}
        </div>
      ) : null}
    </section>
  );
}

type LifeLabPlaylistDebugProps = {
  bundle?: (PlaylistAssetsBundle & {
    fromCache: boolean;
    cache?: LifeLabCacheDiagnostic;
  }) | null;
  batchNotes?: string[];
  technicalDetails?: ReactNode;
  hiddenUnavailableCount?: number;
  isAdmin?: boolean;
  dev?: LifeLabNoteDevMeta | null;
  loadMeta?: LifeLabNoteLoadMeta | null;
  technicalProvenance?: string[];
};

export function LifeLabPlaylistDebug({
  bundle = null,
  batchNotes = [],
  technicalDetails = null,
  hiddenUnavailableCount = 0,
  isAdmin = false,
  dev = null,
  loadMeta = null,
  technicalProvenance = [],
}: LifeLabPlaylistDebugProps) {
  const showDebug =
    isLifeLabDevToolsEnabled() || canViewLifeLabTechnicalDebug(isAdmin);

  if (!showDebug) {
    return null;
  }

  const hasBatchNotes = batchNotes.length > 0;
  const hasTechnicalDetails = Boolean(technicalDetails);
  const hasAssetDiagnostics = Boolean(bundle);
  const hasDevInfo = Boolean(dev && loadMeta);
  const hasTechnicalProvenance = technicalProvenance.length > 0;

  if (
    !hasBatchNotes &&
    !hasTechnicalDetails &&
    !hasAssetDiagnostics &&
    !hasDevInfo &&
    !hasTechnicalProvenance &&
    hiddenUnavailableCount === 0
  ) {
    return null;
  }

  return (
    <details className="ui-settings-details group border-t border-border/50 pt-4">
      <summary className="ui-settings-details-summary">Debug</summary>
      <div className="ui-settings-details-body space-y-4">
        {hiddenUnavailableCount > 0 ? (
          <p className="text-xs text-muted">
            {hiddenUnavailableCount === 1
              ? "1 unavailable playlist entry hidden"
              : `${hiddenUnavailableCount} unavailable playlist entries hidden`}
          </p>
        ) : null}
        {hasAssetDiagnostics && bundle ? (
          <PlaylistAssetDiagnosticsPanel
            bundle={bundle}
            fromCache={bundle.fromCache}
          />
        ) : null}
        {hasDevInfo && dev && loadMeta ? (
          <DevInfoSection dev={dev} loadMeta={loadMeta} />
        ) : null}
        {hasTechnicalProvenance ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Technical provenance
            </p>
            <ul className="space-y-2 text-xs text-muted">
              {technicalProvenance.map((entry, index) => (
                <li
                  key={`${index}-${entry.slice(0, 24)}`}
                  className="rounded-lg border border-border/50 bg-surface px-3 py-2 whitespace-pre-wrap text-foreground/90"
                >
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasBatchNotes ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Batch notes
            </p>
            <ul className="space-y-1.5 text-sm text-muted">
              {batchNotes.map((item, index) => (
                <li key={`batch-note-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasTechnicalDetails ? technicalDetails : null}
      </div>
    </details>
  );
}

/** @deprecated Use LifeLabPlaylistAnalysis */
export const LifeLabPlaylistLearningMap = LifeLabPlaylistAnalysis;

/** @deprecated Use LifeLabPlaylistAnalysis */
export const LifeLabPlaylistSupplementaryAssets = LifeLabPlaylistAnalysis;

/** @deprecated Use LifeLabPlaylistAnalysis */
export const LifeLabPlaylistAssets = LifeLabPlaylistAnalysis;

/** @deprecated Use LifeLabPlaylistAssets */
export const LifeLabPlaylistArtifacts = LifeLabPlaylistAssets;
