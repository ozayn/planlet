import { formatCount } from "@/lib/life-lab/collection-metadata";
import { normalizeLearningMapArtifactMarkdown } from "@/lib/life-lab/mermaid-direction";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import { titleFromMarkdownHeading } from "@/lib/life-lab/slug";

export type PlaylistClusterRow = {
  slug: string;
  title: string;
  description: string | null;
  count: number | null;
  clusterPath: string | null;
};

export type PlaylistClusterFile = {
  slug: string;
  title: string;
  content: string;
  mermaidCode: string | null;
  relativePath: string;
  fileId: string;
  modifiedAt: string | null;
  unavailable: boolean;
  error: string | null;
};

export function normalizeClusterSlug(value: string): string {
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/^clusters\//, "");

  return trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function countDescriptionItems(description: string | null): number | null {
  if (!description?.trim()) {
    return null;
  }

  const explicitCount = description.match(/(\d+)\s+(?:related\s+)?concepts?/i);

  if (explicitCount?.[1]) {
    return Number.parseInt(explicitCount[1], 10);
  }

  const parts = description
    .split(/[,;•·]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.length : null;
}

function summarizeClusterConcepts(description: string | null): string | null {
  if (!description?.trim()) {
    return null;
  }

  const cleaned = description
    .replace(/(\d+)\s+(?:related\s+)?concepts?:?\s*/gi, "")
    .replace(/\s*[·•—–-]\s*$/g, "")
    .trim();

  const parts = cleaned
    .split(/[,;•·]/)
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+$/.test(part))
    .slice(0, 5);

  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatClusterRowMetadata(row: PlaylistClusterRow): {
  conceptsLine: string | null;
  countLine: string | null;
} {
  const description = row.description?.trim() ?? null;
  let count = row.count;

  if (description) {
    const explicitCount = description.match(/(\d+)\s+(?:related\s+)?concepts?/i);

    if (explicitCount?.[1]) {
      count = Number.parseInt(explicitCount[1], 10);
    }
  }

  const conceptsLine = summarizeClusterConcepts(description);
  const countLine =
    count != null && count > 0
      ? count === 1
        ? "1 concept"
        : formatCount(count, "concept", "concepts")
      : null;

  return {
    conceptsLine,
    countLine,
  };
}

function parseListClusterRow(line: string): PlaylistClusterRow | null {
  const trimmed = line.trim();
  const listMatch = trimmed.match(
    /^[-*•]\s+(?:\[(.+?)\]\(([^)]+)\)|\*\*(.+?)\*\*|(.+?))(?:\s+[—–-]\s+(.+))?$/,
  );

  if (!listMatch) {
    return null;
  }

  const title = (listMatch[1] ?? listMatch[3] ?? listMatch[4] ?? "").trim();
  const linkTarget = listMatch[2]?.trim() ?? null;
  const description = listMatch[5]?.trim() ?? null;

  if (!title) {
    return null;
  }

  return {
    slug: normalizeClusterSlug(title),
    title,
    description,
    count: countDescriptionItems(description),
    clusterPath: linkTarget,
  };
}

function parseHeadingClusterBlocks(body: string): PlaylistClusterRow[] {
  const rows: PlaylistClusterRow[] = [];
  const sections = body.split(/^##\s+/m).slice(1);

  for (const section of sections) {
    const [titleLine, ...rest] = section.split("\n");
    const title = titleLine?.trim();

    if (!title) {
      continue;
    }

    const description = rest
      .join("\n")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^[-*•]\s+/gm, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" ")
      .trim();

    rows.push({
      slug: normalizeClusterSlug(title),
      title,
      description: description || null,
      count: countDescriptionItems(description || null),
      clusterPath: null,
    });
  }

  return rows;
}

export function parsePlaylistClusterRows(content: string): PlaylistClusterRow[] {
  const body = stripLeadingMarkdownH1(content).trim();
  const rows: PlaylistClusterRow[] = [];
  const seen = new Set<string>();

  for (const line of body.split("\n")) {
    const row = parseListClusterRow(line);

    if (!row || seen.has(row.slug)) {
      continue;
    }

    seen.add(row.slug);
    rows.push(row);
  }

  if (rows.length > 0) {
    return rows;
  }

  return parseHeadingClusterBlocks(body).filter((row) => {
    if (seen.has(row.slug)) {
      return false;
    }

    seen.add(row.slug);
    return true;
  });
}

export function extractMermaidCode(content: string): string | null {
  const match = content.match(/```mermaid\s*\n([\s\S]*?)```/i);

  return match?.[1]?.trim() ?? null;
}

export function prepareClusterDiagramMarkdown(rawBody: string): {
  content: string;
  mermaidCode: string | null;
  title: string | null;
} {
  const withoutH1 = stripLeadingMarkdownH1(rawBody.trim());
  const prepared = normalizeLearningMapArtifactMarkdown(
    prepareLifeLabMarkdownForReading(withoutH1),
  );

  return {
    content: prepared,
    mermaidCode: extractMermaidCode(prepared),
    title: titleFromMarkdownHeading(rawBody),
  };
}

function clusterPathSuffix(clusterPath: string): string {
  const normalized = clusterPath.replace(/\\/g, "/").trim().toLowerCase();

  if (normalized.startsWith("clusters/")) {
    return normalized;
  }

  return `clusters/${normalized.replace(/^\/+/, "")}`;
}

export function resolveClusterFileForRow(
  row: PlaylistClusterRow,
  clusterFiles: PlaylistClusterFile[],
): PlaylistClusterFile | null {
  if (row.clusterPath) {
    const suffix = clusterPathSuffix(row.clusterPath);
    const explicit = clusterFiles.find((file) =>
      file.relativePath.replace(/\\/g, "/").toLowerCase().endsWith(suffix),
    );

    if (explicit && !explicit.unavailable) {
      return explicit;
    }
  }

  const slugMatch = clusterFiles.find(
    (file) => file.slug === row.slug && !file.unavailable,
  );

  return slugMatch ?? null;
}

export function playlistClusterRelativePath(
  playlistId: string,
  clusterSlug: string,
): string {
  return `playlists/assets/${playlistId}/clusters/${clusterSlug}.md`;
}
