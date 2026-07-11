"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import { MarkdownContent } from "@/components/life-lab/markdown-content";
import { MermaidExpandDialog } from "@/components/life-lab/mermaid-expand-dialog";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import {
  collapsedArtifactLabel,
  prepareArtifactBodyForDisplay,
} from "@/lib/life-lab/playlist-artifact-content";
import type {
  PlaylistAssetDiagnostic,
  PlaylistAssetView,
  PlaylistAssetsBundle,
} from "@/lib/life-lab/playlist-assets";
import {
  resolveClusterFileForRow,
  type PlaylistClusterFile,
  type PlaylistClusterRow,
} from "@/lib/life-lab/playlist-clusters";

type PlaylistAssetsSectionProps = {
  bundle: PlaylistAssetsBundle;
  fromCache?: boolean;
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
}: {
  asset: PlaylistAssetView;
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
      <MarkdownContent content={prepareArtifactBodyForDisplay(asset)} />
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
      <MarkdownContent content={prepareArtifactBodyForDisplay(asset)} />
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
  const metadata = [
    row.description,
    row.count != null ? `${row.count} concepts` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
        className="group flex w-full items-start gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:cursor-default disabled:opacity-60"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium leading-snug text-foreground">
            {row.title}
          </p>
          {metadata ? (
            <p className="line-clamp-2 text-xs text-muted">{metadata}</p>
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
      <ul className="space-y-1">
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
              : "Scroll or pinch to explore the cluster diagram."
          }
        />
      ) : null}
    </section>
  );
}

function FullConceptMapSection({ asset }: { asset: PlaylistAssetView }) {
  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">Full concept map</summary>
      <div className="ui-settings-details-body space-y-2">
        <p className="text-xs text-muted-light">
          Detailed view of all mapped concepts.
        </p>
        {asset.unavailable ? (
          <QuietUnavailable title="Full concept map" />
        ) : (
          <MarkdownContent content={prepareArtifactBodyForDisplay(asset)} />
        )}
      </div>
    </details>
  );
}

function CollapsedArtifactSection({
  asset,
  playlistId,
}: {
  asset: PlaylistAssetView;
  playlistId: string | null;
}) {
  return (
    <details
      key={`${playlistId ?? "playlist"}-${asset.id}`}
      className="ui-settings-details group"
    >
      <summary className="ui-settings-details-summary">
        {collapsedArtifactLabel(asset)}
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

function PlaylistAssetDiagnosticsPanel({
  bundle,
  fromCache,
}: {
  bundle: PlaylistAssetsBundle;
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

const SUPPORTING_ASSET_IDS = new Set([
  "concept-frequencies",
  "people",
  "topic-graph",
  "timeline",
  "people-map",
  "concept-map",
]);

export function LifeLabPlaylistAnalysis({
  bundle,
}: PlaylistAssetsSectionProps) {
  const playlistId =
    bundle.folder.status === "resolved" ? bundle.folder.playlistId : null;
  const learningMap = bundle.artifacts.find(
    (asset) => asset.id === "learning-map",
  );
  const fullConceptMap = bundle.artifacts.find(
    (asset) => asset.id === "full-concept-map",
  );
  const supporting = bundle.artifacts.filter(
    (asset) =>
      asset.tier === "secondary" &&
      SUPPORTING_ASSET_IDS.has(asset.id),
  );
  const showMissingLearningMap =
    bundle.folder.status === "resolved" && !bundle.learningMapFound;
  const hasAnalysis =
    learningMap ||
    bundle.clusterRows.length > 0 ||
    fullConceptMap ||
    supporting.length > 0 ||
    showMissingLearningMap;

  if (!hasAnalysis) {
    return null;
  }

  return (
    <section className="space-y-4 border-t border-border/50 pt-5">
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

      <ConceptClustersSection
        rows={bundle.clusterRows}
        clusterFiles={bundle.clusterFiles}
      />

      {fullConceptMap ? <FullConceptMapSection asset={fullConceptMap} /> : null}

      {supporting.length > 0 ? (
        <div className="space-y-2">
          {supporting.map((asset) => (
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
  bundle?: (PlaylistAssetsBundle & { fromCache: boolean }) | null;
  batchNotes?: string[];
  technicalDetails?: ReactNode;
};

export function LifeLabPlaylistDebug({
  bundle = null,
  batchNotes = [],
  technicalDetails = null,
}: LifeLabPlaylistDebugProps) {
  if (!isLifeLabDevToolsEnabled()) {
    return null;
  }

  const hasBatchNotes = batchNotes.length > 0;
  const hasTechnicalDetails = Boolean(technicalDetails);
  const hasAssetDiagnostics = Boolean(bundle);

  if (!hasBatchNotes && !hasTechnicalDetails && !hasAssetDiagnostics) {
    return null;
  }

  return (
    <details className="ui-settings-details group border-t border-border/50 pt-4">
      <summary className="ui-settings-details-summary">Debug</summary>
      <div className="ui-settings-details-body space-y-4">
        {hasAssetDiagnostics && bundle ? (
          <PlaylistAssetDiagnosticsPanel
            bundle={bundle}
            fromCache={bundle.fromCache}
          />
        ) : null}
        {hasBatchNotes ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Batch notes
            </p>
            <ul className="space-y-1.5 text-sm text-muted">
              {batchNotes.map((item) => (
                <li key={item}>{item}</li>
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
