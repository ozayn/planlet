import { isLearningMapSection } from "@/lib/life-lab/learning-map-sections";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import type { PlaylistAssetId, PlaylistAssetView } from "@/lib/life-lab/playlist-assets";

const ASSET_DISPLAY_ORDER: PlaylistAssetId[] = [
  "learning-map",
  "summary",
  "full-concept-map",
  "concept-frequencies",
  "people",
  "topic-graph",
  "timeline",
  "people-map",
  "concept-map",
];

const REDUNDANT_SUMMARY_SECTIONS = [
  /^recent videos?$/i,
  /^questions?$/i,
  /^developer information$/i,
  /^processing\b/i,
  /^batch\b/i,
  /^technical\b/i,
] as const;

const ASSET_SECTION_MATCHERS: Partial<
  Record<PlaylistAssetId, (title: string) => boolean>
> = {
  "learning-map": (title) => isLearningMapSection(normalizeSectionTitle(title)),
  summary: (title) => /^(?:playlist\s+)?summary$/i.test(normalizeSectionTitle(title)),
  "clusters-index": (title) =>
    /^(?:concept\s+)?clusters?$/i.test(normalizeSectionTitle(title)),
  "full-concept-map": (title) =>
    /^full\s+concept\s+map$/i.test(normalizeSectionTitle(title)),
  "concept-frequencies": (title) =>
    /^(?:concept\s+frequencies|concepts?)$/i.test(normalizeSectionTitle(title)),
  people: (title) =>
    /^(?:people(?:\s+index)?)$/i.test(normalizeSectionTitle(title)),
  timeline: (title) => /^timeline$/i.test(normalizeSectionTitle(title)),
  "topic-graph": (title) => /^topic\s+graph$/i.test(normalizeSectionTitle(title)),
  "people-map": (title) => /^people\s+map$/i.test(normalizeSectionTitle(title)),
  "concept-map": (title) => /^concept\s+map$/i.test(normalizeSectionTitle(title)),
};

const COLLAPSED_LABELS: Record<PlaylistAssetId, string> = {
  "learning-map": "Learning Map",
  summary: "Playlist Summary",
  "clusters-index": "Concept Clusters",
  "full-concept-map": "Full concept map",
  "concept-frequencies": "Concepts",
  people: "People",
  timeline: "Timeline",
  "topic-graph": "Topic Graph",
  "people-map": "People Map",
  "concept-map": "Concept Map",
};

function normalizeSectionTitle(title: string): string {
  return title
    .replace(/^[^—–-]+[—–-]\s*/, "")
    .replace(/\s+#\d+\s*$/, "")
    .trim();
}

function listMarkdownSectionRanges(body: string): Array<{
  title: string;
  start: number;
  end: number;
}> {
  const headingPattern = /^(#{1,6})\s+(.+?)\s*$/gm;
  const headings = [...body.matchAll(headingPattern)];
  const sections: Array<{ title: string; start: number; end: number }> = [];

  for (let index = 0; index < headings.length; index += 1) {
    const match = headings[index];
    const level = match[1].length;
    const title = match[2].trim();
    const start = match.index ?? 0;
    let end = body.length;

    for (let nextIndex = index + 1; nextIndex < headings.length; nextIndex += 1) {
      const nextMatch = headings[nextIndex];

      if (nextMatch[1].length <= level) {
        end = nextMatch.index ?? body.length;
        break;
      }
    }

    sections.push({ title, start, end });
  }

  return sections;
}

function stripMarkdownSections(
  body: string,
  shouldStrip: (title: string) => boolean,
): string {
  const sections = listMarkdownSectionRanges(body);

  if (sections.length === 0) {
    return body;
  }

  let result = body;

  for (const section of [...sections].reverse()) {
    if (!shouldStrip(section.title)) {
      continue;
    }

    result = `${result.slice(0, section.start)}${result.slice(section.end)}`;
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function stripLeadingMatchingHeadings(
  content: string,
  labels: string[],
): string {
  let body = stripLeadingMarkdownH1(content).trim();
  const normalizedLabels = new Set(
    labels.map((label) => label.trim().toLowerCase()),
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const match = body.match(/^(#{1,3})\s+(.+?)\s*$/m);

    if (!match) {
      break;
    }

    const normalized = normalizeSectionTitle(match[2]).toLowerCase();

    if (!normalizedLabels.has(normalized)) {
      break;
    }

    body = body.slice(match[0].length).trimStart();
  }

  return body;
}

export function deduplicateTimelineMarkdown(content: string): string {
  const sections = listMarkdownSectionRanges(content);

  if (sections.length === 0) {
    return deduplicateTimelineLines(content);
  }

  const mergedSections = new Map<string, string>();
  const result: string[] = [];
  const preamble = content.slice(0, sections[0]?.start ?? 0).trim();

  if (preamble) {
    result.push(deduplicateTimelineLines(preamble));
  }

  for (const section of sections) {
    const normalizedTitle = normalizeTimelineSectionTitle(section.title);
    const sectionBody = content.slice(section.start, section.end).trim();

    if (mergedSections.has(normalizedTitle)) {
      const existing = mergedSections.get(normalizedTitle) ?? "";
      const additionalLines = sectionBody.split("\n").slice(1).join("\n").trim();

      mergedSections.set(
        normalizedTitle,
        deduplicateTimelineLines(
          additionalLines ? `${existing}\n${additionalLines}` : existing,
        ),
      );
      continue;
    }

    mergedSections.set(normalizedTitle, deduplicateTimelineLines(sectionBody));
  }

  result.push(...mergedSections.values());

  return result.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeTimelineSectionTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeTimelineLine(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

function deduplicateTimelineLines(content: string): string {
  const lines = content.split("\n");
  const seenLines = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const previous = result[result.length - 1]?.trim();

    if (trimmed && trimmed === previous) {
      continue;
    }

    const normalized = normalizeTimelineLine(trimmed);

    if (normalized && seenLines.has(normalized)) {
      continue;
    }

    if (normalized) {
      seenLines.add(normalized);
    }

    result.push(line);
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractMarkdownSection(
  content: string,
  headingPattern: RegExp,
): string | null {
  const match = headingPattern.exec(content);

  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  const section = (
    nextHeading === -1 ? rest : rest.slice(0, nextHeading)
  ).trim();

  return section || null;
}

export function countMarkdownEntries(content: string): number | null {
  const bullets = content.match(/^[-*•]\s+\S/gm);

  if (bullets && bullets.length > 0) {
    return bullets.length;
  }

  const numbered = content.match(/^\d+\.\s+\S/gm);

  if (numbered && numbered.length > 0) {
    return numbered.length;
  }

  const tableRows = content
    .split("\n")
    .filter((line) => line.trim().startsWith("|") && !/^\|\s*:?-{3,}/.test(line.trim()));

  if (tableRows.length > 1) {
    return tableRows.length - 1;
  }

  return null;
}

export function collapsedArtifactLabel(asset: PlaylistAssetView): string {
  const label = COLLAPSED_LABELS[asset.id] ?? asset.title;
  const count = countMarkdownEntries(asset.content);

  return count === null ? label : `${label} · ${count}`;
}

function shouldStripSummarySection(
  title: string,
  availableAssetMatchers: Array<(title: string) => boolean>,
): boolean {
  const normalized = normalizeSectionTitle(title);

  if (REDUNDANT_SUMMARY_SECTIONS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return availableAssetMatchers.some((matcher) => matcher(title));
}

function stripOrphanMermaidBlocks(body: string): string {
  return body
    .replace(/```mermaid\s*\n[\s\S]*?```/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function preparePlaylistSummaryForDisplay(
  asset: PlaylistAssetView,
  availableAssetIds: Set<PlaylistAssetId>,
): string {
  const availableMatchers = [...availableAssetIds]
    .map((id) => ASSET_SECTION_MATCHERS[id])
    .filter((matcher): matcher is (title: string) => boolean => Boolean(matcher));

  let body = prepareArtifactBodyForDisplay(asset);

  return stripMarkdownSections(body, (title) =>
    shouldStripSummarySection(title, availableMatchers) ||
    REDUNDANT_SUMMARY_SECTIONS.some((pattern) =>
      pattern.test(normalizeSectionTitle(title)),
    ),
  ).trim();
}

export function prepareArtifactBodyForDisplay(
  asset: PlaylistAssetView,
): string {
  const displayLabel = COLLAPSED_LABELS[asset.id] ?? asset.title;
  let body = stripLeadingMatchingHeadings(asset.content, [
    displayLabel,
    asset.title,
  ]);

  if (asset.id === "timeline") {
    body = deduplicateTimelineMarkdown(body);
  }

  if (asset.id === "summary") {
    body = stripMarkdownSections(body, (title) =>
      REDUNDANT_SUMMARY_SECTIONS.some((pattern) =>
        pattern.test(normalizeSectionTitle(title)),
      ),
    );
  }

  return body.trim();
}

export function deduplicatePlaylistArtifactsForDisplay(
  artifacts: PlaylistAssetView[],
): PlaylistAssetView[] {
  const available = artifacts.filter((artifact) => !artifact.unavailable);
  const availableMatchers = available
    .map((artifact) => ASSET_SECTION_MATCHERS[artifact.id])
    .filter((matcher): matcher is (title: string) => boolean => Boolean(matcher));

  const preferredOrder = new Map(
    ASSET_DISPLAY_ORDER.map((id, index) => [id, index]),
  );
  const seenHashes = new Map<string, PlaylistAssetId>();
  const result: PlaylistAssetView[] = [];

  for (const artifact of artifacts) {
    if (artifact.unavailable) {
      result.push(artifact);
      continue;
    }

    let content = prepareArtifactBodyForDisplay(artifact);

    if (artifact.id === "summary") {
      content = stripMarkdownSections(content, (title) =>
        shouldStripSummarySection(title, availableMatchers),
      );

      if (available.some((item) => item.id === "learning-map")) {
        content = stripMarkdownSections(content, (title) =>
          isLearningMapSection(normalizeSectionTitle(title)),
        );
        content = stripOrphanMermaidBlocks(content);
      }
    }

    const contentHash = content.trim();

    if (!contentHash) {
      continue;
    }

    const duplicateOf = [...seenHashes.entries()].find(
      ([hash]) => hash === contentHash,
    )?.[1];

    if (duplicateOf) {
      const keepCurrent =
        (preferredOrder.get(artifact.id) ?? Number.MAX_SAFE_INTEGER) <
        (preferredOrder.get(duplicateOf) ?? Number.MAX_SAFE_INTEGER);

      if (!keepCurrent) {
        continue;
      }

      const replaceIndex = result.findIndex((item) => item.id === duplicateOf);

      if (replaceIndex !== -1) {
        result.splice(replaceIndex, 1);
        seenHashes.delete(contentHash);
      }
    }

    if (artifact.id === "full-concept-map") {
      const learningMap = result.find((item) => item.id === "learning-map");

      if (learningMap?.contentHash === contentHash) {
        continue;
      }
    }

    if (artifact.id === "concept-map") {
      const fullMap = result.find((item) => item.id === "full-concept-map");

      if (fullMap?.contentHash === contentHash) {
        continue;
      }
    }

    seenHashes.set(contentHash, artifact.id);
    result.push({
      ...artifact,
      content,
      contentHash,
    });
  }

  return result;
}

function stripMarkdownSectionsWithLog(
  body: string,
  shouldStrip: (title: string) => boolean,
): { body: string; stripped: string[] } {
  const sections = listMarkdownSectionRanges(body);
  const stripped: string[] = [];

  if (sections.length === 0) {
    return { body, stripped };
  }

  let result = body;

  for (const section of [...sections].reverse()) {
    if (!shouldStrip(section.title)) {
      continue;
    }

    stripped.push(section.title);
    result = `${result.slice(0, section.start)}${result.slice(section.end)}`;
  }

  return {
    body: result.replace(/\n{3,}/g, "\n\n").trim(),
    stripped,
  };
}

export function suppressDuplicatePlaylistIndexContent(input: {
  indexBody: string;
  assets: PlaylistAssetView[];
  presentAssetIds?: PlaylistAssetId[];
}): { body: string; suppressedDuplicates: string[] } {
  const suppressed = new Set<string>();
  const available = input.assets.filter((asset) => !asset.unavailable);
  const presentAssetIds = new Set(input.presentAssetIds ?? available.map((asset) => asset.id));
  let body = input.indexBody;

  for (const asset of available) {
    if (asset.id === "learning-map") {
      const { body: withoutSections, stripped } = stripMarkdownSectionsWithLog(
        body,
        (title) => isLearningMapSection(normalizeSectionTitle(title)),
      );

      body = withoutSections;

      if (stripped.length > 0) {
        suppressed.add("index-learning-map");
      }

      body = stripOrphanMermaidBlocks(body);
      continue;
    }

    const matcher = ASSET_SECTION_MATCHERS[asset.id];

    if (!matcher || asset.id === "summary") {
      continue;
    }

    const { body: withoutSections, stripped } = stripMarkdownSectionsWithLog(
      body,
      matcher,
    );

    body = withoutSections;

    if (stripped.length > 0) {
      suppressed.add(`index-${asset.id}`);
    }
  }

  if (presentAssetIds.has("clusters-index")) {
    const { body: withoutClusters, stripped } = stripMarkdownSectionsWithLog(
      body,
      (title) =>
        ASSET_SECTION_MATCHERS["clusters-index"]?.(title) ?? false,
    );

    body = withoutClusters;

    if (stripped.length > 0) {
      suppressed.add("index-clusters-index");
    }
  }

  if (presentAssetIds.has("full-concept-map")) {
    const { body: withoutFullMap, stripped } = stripMarkdownSectionsWithLog(
      body,
      (title) =>
        ASSET_SECTION_MATCHERS["full-concept-map"]?.(title) ?? false,
    );

    body = withoutFullMap;

    if (stripped.length > 0) {
      suppressed.add("index-full-concept-map");
    }
  }

  if (available.some((asset) => asset.id === "summary")) {
    const { body: withoutSummary, stripped } = stripMarkdownSectionsWithLog(
      body,
      (title) => /^(?:playlist summary|summary)$/i.test(normalizeSectionTitle(title)),
    );

    body = withoutSummary;

    if (stripped.length > 0) {
      suppressed.add("index-playlist-summary");
    }
  }

  const { body: withoutRedundant, stripped: redundantStripped } =
    stripMarkdownSectionsWithLog(body, (title) =>
      REDUNDANT_SUMMARY_SECTIONS.some((pattern) =>
        pattern.test(normalizeSectionTitle(title)),
      ),
    );

  body = withoutRedundant;

  for (const title of redundantStripped) {
    suppressed.add(
      `index-${normalizeSectionTitle(title).toLowerCase().replace(/\s+/g, "-")}`,
    );
  }

  return {
    body,
    suppressedDuplicates: [...suppressed],
  };
}
