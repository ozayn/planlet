import { createHash } from "node:crypto";

import type {
  PlaylistClusterFile,
  PlaylistClusterRow,
} from "@/lib/life-lab/playlist-clusters";
import {
  normalizeClusterSlug,
  parsePlaylistClusterRows,
  prepareClusterDiagramMarkdown,
} from "@/lib/life-lab/playlist-clusters";

import type {
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";
import { normalizeLearningMapArtifactMarkdown } from "@/lib/life-lab/mermaid-direction";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import type { PlaylistAssetFilename } from "@/lib/life-lab/playlist-asset-paths";
import {
  isPlaylistAssetRelativePath,
  playlistAssetRelativePath,
} from "@/lib/life-lab/playlist-asset-paths";
import {
  resolvePlaylistAssetFolder,
  resolvePlaylistAssetsFolder,
  type PlaylistAssetResolution,
  type PlaylistAssetsFolderResult,
} from "@/lib/life-lab/playlist-asset-resolution";
import { titleFromMarkdownHeading } from "@/lib/life-lab/slug";
import type { LifeLabSectionNoteRecord } from "@/lib/life-lab/enrichment";
import { deduplicatePlaylistArtifactsForDisplay } from "@/lib/life-lab/playlist-artifact-content";
export { suppressDuplicatePlaylistIndexContent } from "@/lib/life-lab/playlist-artifact-content";

export const PLAYLIST_ASSET_IDS = [
  "learning-map",
  "summary",
  "clusters-index",
  "full-concept-map",
  "concept-frequencies",
  "people",
  "topic-graph",
  "timeline",
  "people-map",
  "concept-map",
] as const;

export type PlaylistAssetId = (typeof PLAYLIST_ASSET_IDS)[number];

export type PlaylistAssetTier = "primary" | "secondary" | "meta";

export type PlaylistAssetDefinition = {
  id: PlaylistAssetId;
  filename: PlaylistAssetFilename;
  fallbackTitle: string;
  tier: PlaylistAssetTier;
  normalizeMermaid: boolean;
};

export const PLAYLIST_ASSET_DEFINITIONS: PlaylistAssetDefinition[] = [
  {
    id: "learning-map",
    filename: "playlist-learning-map.md",
    fallbackTitle: "Learning Map",
    tier: "primary",
    normalizeMermaid: true,
  },
  {
    id: "summary",
    filename: "playlist-summary.md",
    fallbackTitle: "Playlist Summary",
    tier: "primary",
    normalizeMermaid: false,
  },
  {
    id: "clusters-index",
    filename: "playlist-clusters.md",
    fallbackTitle: "Concept Clusters",
    tier: "meta",
    normalizeMermaid: false,
  },
  {
    id: "full-concept-map",
    filename: "playlist-full-concept-map.md",
    fallbackTitle: "Full Concept Map",
    tier: "secondary",
    normalizeMermaid: true,
  },
  {
    id: "concept-frequencies",
    filename: "concept-frequencies.md",
    fallbackTitle: "Concept Frequencies",
    tier: "secondary",
    normalizeMermaid: false,
  },
  {
    id: "people",
    filename: "people-index.md",
    fallbackTitle: "People",
    tier: "secondary",
    normalizeMermaid: false,
  },
  {
    id: "topic-graph",
    filename: "topic-graph.md",
    fallbackTitle: "Topic Graph",
    tier: "secondary",
    normalizeMermaid: true,
  },
  {
    id: "timeline",
    filename: "playlist-timeline.md",
    fallbackTitle: "Timeline",
    tier: "secondary",
    normalizeMermaid: false,
  },
  {
    id: "people-map",
    filename: "playlist-people-map.md",
    fallbackTitle: "People Map",
    tier: "secondary",
    normalizeMermaid: true,
  },
  {
    id: "concept-map",
    filename: "playlist-concept-map.md",
    fallbackTitle: "Concept Map",
    tier: "secondary",
    normalizeMermaid: true,
  },
];

export type PlaylistAssetRecordMatch = {
  definition: PlaylistAssetDefinition;
  record: LifeLabSectionNoteRecord;
  relativePath: string;
};

export type PlaylistAssetDiagnostic = {
  id: PlaylistAssetId;
  relativePath: string | null;
  fileId: string | null;
  modifiedAt: string | null;
  found: boolean;
  fromCache: boolean;
  error: string | null;
};

export type PlaylistAssetView = {
  id: PlaylistAssetId;
  title: string;
  content: string;
  tier: PlaylistAssetTier;
  relativePath: string;
  fileId: string;
  modifiedAt: string | null;
  unavailable: boolean;
  error: string | null;
  contentHash: string | null;
};

export type PlaylistAssetsBundle = {
  folder: PlaylistAssetsFolderResult;
  resolution: PlaylistAssetResolution | null;
  artifacts: PlaylistAssetView[];
  clusterRows: PlaylistClusterRow[];
  clusterFiles: PlaylistClusterFile[];
  diagnostics: PlaylistAssetDiagnostic[];
  suppressedDuplicates: string[];
  strippedIndexBody: string | null;
  learningMapFound: boolean;
  learningMapSignature: string | null;
};

function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

export function extractLearningMapSignature(content: string): string | null {
  const mermaidMatch = content.match(/```mermaid\s*\n([\s\S]*?)```/i);
  const source = mermaidMatch?.[1]?.trim() ?? content.trim();
  const labelMatch = source.match(/\[([^\]]+)\]/);

  return labelMatch?.[1]?.trim() ?? null;
}

function summarizeLearningMap(artifacts: PlaylistAssetView[]): {
  learningMapFound: boolean;
  learningMapSignature: string | null;
} {
  const learningMap = artifacts.find(
    (artifact) => artifact.id === "learning-map" && !artifact.unavailable,
  );

  if (!learningMap?.content.trim()) {
    return {
      learningMapFound: false,
      learningMapSignature: null,
    };
  }

  return {
    learningMapFound: true,
    learningMapSignature: extractLearningMapSignature(learningMap.content),
  };
}

export function emptyPlaylistAssetsBundle(
  folder: PlaylistAssetsFolderResult,
): PlaylistAssetsBundle {
  return {
    folder,
    resolution: null,
    artifacts: [],
    clusterRows: [],
    clusterFiles: [],
    diagnostics: emptyPlaylistAssetDiagnostics(),
    suppressedDuplicates: [],
    strippedIndexBody: null,
    learningMapFound: false,
    learningMapSignature: null,
  };
}

export function resolvePlaylistClusterRecords(
  resolution: PlaylistAssetResolution,
  records: LifeLabSectionNoteRecord[],
): Array<{
  record: LifeLabSectionNoteRecord;
  slug: string;
  relativePath: string;
}> {
  const prefix = `${resolution.assetsRelativePath}/clusters/`.toLowerCase();
  const matches: Array<{
    record: LifeLabSectionNoteRecord;
    slug: string;
    relativePath: string;
  }> = [];

  for (const record of records) {
    const normalized = record.relativePath.replace(/\\/g, "/");

    if (!normalized.toLowerCase().startsWith(prefix)) {
      continue;
    }

    const filename = normalized.slice(prefix.length);

    if (!filename.endsWith(".md") || filename.includes("/")) {
      continue;
    }

    matches.push({
      record,
      slug: normalizeClusterSlug(filename),
      relativePath: normalized,
    });
  }

  return matches;
}

export function resolvePlaylistAssetRecords(
  resolution: PlaylistAssetResolution,
  records: LifeLabSectionNoteRecord[],
): PlaylistAssetRecordMatch[] {
  const recordsByPath = new Map(
    records.map((record) => [record.relativePath, record]),
  );
  const matches: PlaylistAssetRecordMatch[] = [];

  for (const definition of PLAYLIST_ASSET_DEFINITIONS) {
    const relativePath = playlistAssetRelativePath(
      resolution.playlistId,
      definition.filename,
    );
    const record = recordsByPath.get(relativePath);

    if (record) {
      matches.push({
        definition,
        record,
        relativePath,
      });
    }
  }

  return matches;
}

export function resolvePlaylistAssetTitle(
  definition: PlaylistAssetDefinition,
  rawContent: string,
): string {
  return titleFromMarkdownHeading(rawContent) ?? definition.fallbackTitle;
}

export function emptyPlaylistAssetDiagnostics(): PlaylistAssetDiagnostic[] {
  return PLAYLIST_ASSET_DEFINITIONS.map((definition) => ({
    id: definition.id,
    relativePath: null,
    fileId: null,
    modifiedAt: null,
    found: false,
    fromCache: false,
    error: null,
  }));
}

export function preparePlaylistAssetMarkdown(
  rawBody: string,
  definition: PlaylistAssetDefinition,
): string {
  const withoutH1 = stripLeadingMarkdownH1(rawBody.trim());
  const prepared = prepareLifeLabMarkdownForReading(withoutH1);

  if (definition.normalizeMermaid) {
    return normalizeLearningMapArtifactMarkdown(prepared);
  }

  return prepared;
}

export function orderPlaylistAssetsForDisplay(
  assets: PlaylistAssetView[],
): PlaylistAssetView[] {
  const order = new Map(
    PLAYLIST_ASSET_DEFINITIONS.map((definition, index) => [
      definition.id,
      index,
    ]),
  );

  return [...assets].sort(
    (left, right) =>
      (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function buildPlaylistAssetsBundle(input: {
  folder: PlaylistAssetsFolderResult;
  resolution: PlaylistAssetResolution | null;
  matches: PlaylistAssetRecordMatch[];
  loaded: Array<{
    match: PlaylistAssetRecordMatch;
    content: string | null;
    rawBody: string | null;
    fromCache: boolean;
    error: string | null;
  }>;
  clusterRows?: PlaylistClusterRow[];
  clusterFiles?: PlaylistClusterFile[];
  suppressedDuplicates?: string[];
}): PlaylistAssetsBundle {
  const artifacts: PlaylistAssetView[] = [];
  const diagnostics = emptyPlaylistAssetDiagnostics();

  for (const entry of input.loaded) {
    const { match, content, rawBody, fromCache, error } = entry;
    const diagnostic = diagnostics.find((item) => item.id === match.definition.id);

    if (!diagnostic) {
      continue;
    }

    diagnostic.relativePath = match.relativePath;
    diagnostic.fileId = match.record.fileId;
    diagnostic.modifiedAt = match.record.modifiedAt;
    diagnostic.found = true;
    diagnostic.fromCache = fromCache;
    diagnostic.error = error;

    if (!content?.trim() || error) {
      artifacts.push({
        id: match.definition.id,
        title: match.definition.fallbackTitle,
        content: "",
        tier: match.definition.tier,
        relativePath: match.relativePath,
        fileId: match.record.fileId,
        modifiedAt: match.record.modifiedAt,
        unavailable: true,
        error: error ?? "This asset could not be loaded.",
        contentHash: null,
      });
      continue;
    }

    artifacts.push({
      id: match.definition.id,
      title: resolvePlaylistAssetTitle(
        match.definition,
        rawBody ?? content ?? "",
      ),
      content,
      tier: match.definition.tier,
      relativePath: match.relativePath,
      fileId: match.record.fileId,
      modifiedAt: match.record.modifiedAt,
      unavailable: false,
      error: null,
      contentHash: hashContent(content),
    });
  }

  return {
    folder: input.folder,
    resolution: input.resolution,
    artifacts: deduplicatePlaylistArtifactsForDisplay(
      artifacts.filter((artifact) => artifact.tier !== "meta"),
    ),
    clusterRows: input.clusterRows ?? [],
    clusterFiles: input.clusterFiles ?? [],
    diagnostics,
    suppressedDuplicates: input.suppressedDuplicates ?? [],
    strippedIndexBody: null,
    ...summarizeLearningMap(artifacts),
  };
}

export function buildPlaylistClusterFile(input: {
  slug: string;
  relativePath: string;
  fileId: string;
  modifiedAt: string | null;
  rawBody: string | null;
  error?: string | null;
}): PlaylistClusterFile {
  if (!input.rawBody?.trim() || input.error) {
    return {
      slug: input.slug,
      title: input.slug,
      content: "",
      mermaidCode: null,
      relativePath: input.relativePath,
      fileId: input.fileId,
      modifiedAt: input.modifiedAt,
      unavailable: true,
      error: input.error ?? "This cluster diagram could not be loaded.",
    };
  }

  const prepared = prepareClusterDiagramMarkdown(input.rawBody);

  return {
    slug: input.slug,
    title: prepared.title ?? input.slug,
    content: prepared.content,
    mermaidCode: prepared.mermaidCode,
    relativePath: input.relativePath,
    fileId: input.fileId,
    modifiedAt: input.modifiedAt,
    unavailable: false,
    error: null,
  };
}

export function parseClusterRowsFromLoadedAssets(
  loaded: Array<{
    match: PlaylistAssetRecordMatch;
    content: string | null;
    rawBody: string | null;
  }>,
): PlaylistClusterRow[] {
  const clustersIndex = loaded.find(
    (entry) => entry.match.definition.id === "clusters-index",
  );

  if (!clustersIndex?.rawBody?.trim()) {
    return [];
  }

  return parsePlaylistClusterRows(clustersIndex.rawBody);
}

export function resolvePlaylistAssetsForIndexNote(
  indexNote: Pick<
    LifeLabNoteSummary,
    | "slug"
    | "title"
    | "fileId"
    | "relativePath"
    | "subfolderLabel"
    | "metadata"
    | "excerpt"
  >,
  records: LifeLabSectionNoteRecord[],
  body = "",
): {
  folder: PlaylistAssetsFolderResult;
  resolution: PlaylistAssetResolution | null;
  matches: PlaylistAssetRecordMatch[];
} {
  const folder = resolvePlaylistAssetsFolder({
    indexNote,
    body,
    records,
  });

  if (folder.status !== "resolved") {
    return { folder, resolution: null, matches: [] };
  }

  const resolution = resolvePlaylistAssetFolder({
    indexNote,
    body,
    records,
  });

  if (!resolution) {
    return { folder, resolution: null, matches: [] };
  }

  return {
    folder,
    resolution,
    matches: resolvePlaylistAssetRecords(resolution, records),
  };
}

export {
  isPlaylistAssetRelativePath,
} from "@/lib/life-lab/playlist-asset-paths";

export {
  resolvePlaylistAssetFolder,
  resolvePlaylistAssetsFolder,
  playlistAssetsCacheKeyParts,
  type PlaylistAssetResolution,
  type PlaylistAssetResolutionSource,
  type PlaylistAssetsFolderResult,
} from "@/lib/life-lab/playlist-asset-resolution";
