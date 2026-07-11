"use client";

import type { ReactNode } from "react";

import { MarkdownContent } from "@/components/life-lab/markdown-content";
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

function PrimaryArtifactSection({
  title,
  asset,
  playlistId,
}: {
  title: string;
  asset: PlaylistAssetView;
  playlistId: string | null;
}) {
  if (asset.unavailable) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <QuietUnavailable title={title} />
      </section>
    );
  }

  return (
    <section
      key={`${playlistId ?? "playlist"}-${asset.id}`}
      className="space-y-2"
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <MarkdownContent content={prepareArtifactBodyForDisplay(asset)} />
    </section>
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

export function LifeLabPlaylistAnalysis({
  bundle,
}: PlaylistAssetsSectionProps) {
  const playlistId =
    bundle.folder.status === "resolved" ? bundle.folder.playlistId : null;
  const learningMap = bundle.artifacts.find(
    (asset) => asset.id === "learning-map",
  );
  const summary = bundle.artifacts.find((asset) => asset.id === "summary");
  const secondary = bundle.artifacts.filter(
    (asset) => asset.tier === "secondary",
  );
  const showMissingLearningMap =
    bundle.folder.status === "resolved" && !bundle.learningMapFound;
  const hasAnalysis =
    learningMap ||
    summary ||
    secondary.length > 0 ||
    showMissingLearningMap;

  if (!hasAnalysis) {
    return null;
  }

  return (
    <section className="space-y-4 border-t border-border/50 pt-5">
      <h2 className="text-sm font-semibold text-foreground">Playlist analysis</h2>

      {learningMap ? (
        <PrimaryArtifactSection
          title="Learning Map"
          asset={learningMap}
          playlistId={playlistId}
        />
      ) : showMissingLearningMap ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Learning Map</h3>
          <p className="text-xs text-muted-light">
            Learning Map not available yet.
          </p>
        </section>
      ) : null}

      {summary ? (
        <PrimaryArtifactSection
          title="Playlist Summary"
          asset={summary}
          playlistId={playlistId}
        />
      ) : null}

      {secondary.length > 0 ? (
        <div className="space-y-2">
          {secondary.map((asset) => (
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
