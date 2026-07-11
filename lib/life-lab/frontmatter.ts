import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { extractFrontmatterTechnicalNotes } from "@/lib/life-lab/hidden-markdown-sections";
import { normalizeLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { pickSourceUrlFromFrontmatterRaw } from "@/lib/life-lab/source-url";
import { normalizePlaylistImageFields } from "@/lib/life-lab/playlist-thumbnail";

const NESTED_FRONTMATTER_OBJECT_KEYS = new Set([
  "image",
  "youtube_thumbnail",
  "thumbnail",
  "coverImage",
]);

export type ParsedLifeLabMarkdown = {
  metadata: LifeLabNoteMetadata;
  body: string;
  technicalProvenance: string[];
};

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseYamlValue(value: string): string | boolean | number {
  const trimmed = value.trim();

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return trimmed.replace(/^["']|["']$/g, "");
}

function parseYamlFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;
  let currentNestedKey: string | null = null;
  let currentNested: Record<string, unknown> | null = null;

  function flushNestedObject(): void {
    if (currentNestedKey && currentNested) {
      result[currentNestedKey] = currentNested;
    }

    currentNestedKey = null;
    currentNested = null;
  }

  for (const line of yaml.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (indent > 0 && currentNested) {
      const nestedMatch = trimmed.match(/^([a-z_]+):\s*(.*)$/i);

      if (!nestedMatch) {
        continue;
      }

      const [, key, rawValue] = nestedMatch;

      if (rawValue !== "") {
        currentNested[key] = parseYamlValue(rawValue);
      }

      continue;
    }

    if (trimmed.startsWith("- ") && currentArrayKey) {
      const items = result[currentArrayKey];

      if (Array.isArray(items)) {
        items.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ""));
      }

      continue;
    }

    const colonMatch = trimmed.match(/^([a-z_]+):\s*(.*)$/i);

    if (!colonMatch) {
      continue;
    }

    const [, key, rawValue] = colonMatch;

    flushNestedObject();
    currentArrayKey = null;

    if (rawValue === "") {
      if (NESTED_FRONTMATTER_OBJECT_KEYS.has(key)) {
        currentNestedKey = key;
        currentNested = {};
      } else {
        currentArrayKey = key;
        result[key] = [];
      }

      continue;
    }

    result[key] = parseYamlValue(rawValue);
  }

  flushNestedObject();

  return result;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function normalizeMetadata(raw: Record<string, unknown>): LifeLabNoteMetadata {
  const metadata: LifeLabNoteMetadata = {};

  const stringFields = [
    "type",
    "section",
    "source",
    "channel",
    "channelName",
    "youtubeChannel",
    "sourceChannel",
    "channelId",
    "youtubeChannelId",
    "channel_id",
    "youtube_channel_id",
    "playlist",
    "playlist_url",
    "collectionPath",
    "playlistPath",
    "folderPath",
    "collectionSlug",
    "playlist_id",
    "playlistId",
    "asset_id",
    "assetId",
    "assets_path",
    "assetsPath",
    "asset_path",
    "assetPath",
    "playlistAssetPath",
    "playlist_asset_path",
    "assetFolderId",
    "asset_folder_id",
    "thumbnailUrl",
    "thumbnail_url",
    "imageUrl",
    "videoId",
    "youtubeVideoId",
    "video_id",
    "youtube_video_id",
    "youtubeUrl",
    "youtube_url",
    "sourceUrl",
    "date",
    "study_status",
    "term",
    "category",
    "summary",
  ] as const;

  for (const field of stringFields) {
    const value = raw[field];

    if (typeof value === "string" && value.trim()) {
      metadata[field] = value.trim();
    }
  }

  if (typeof raw.episode === "string" && raw.episode.trim()) {
    metadata.episode = raw.episode.trim();
  } else if (typeof raw.episode === "number" && Number.isFinite(raw.episode)) {
    metadata.episode = raw.episode;
  }

  const arrayFields = ["topics", "people", "places", "tags", "related"] as const;

  for (const field of arrayFields) {
    const value = normalizeStringArray(raw[field]);

    if (value) {
      metadata[field] = value;
    }
  }

  if (raw.flashcards === true) {
    metadata.flashcards = true;
  }

  if (raw.reviewed === true) {
    metadata.reviewed = true;
  } else if (raw.reviewed === false) {
    metadata.reviewed = false;
  }

  if (typeof raw.sourceType === "string" && raw.sourceType.trim()) {
    metadata.source = metadata.source ?? raw.sourceType.trim();
  }

  const sourceUrl = pickSourceUrlFromFrontmatterRaw(raw);

  if (sourceUrl) {
    metadata.source_url = sourceUrl;
    metadata.video_url = sourceUrl;
  }

  const image = normalizeLifeLabNoteImage(raw.image);

  if (image) {
    metadata.image = image;
  }

  const youtubeThumbnail = normalizeLifeLabNoteImage(raw.youtube_thumbnail);

  if (youtubeThumbnail) {
    metadata.youtube_thumbnail = youtubeThumbnail;
  }

  Object.assign(metadata, normalizePlaylistImageFields(raw));

  return metadata;
}

export function hasLifeLabMetadata(metadata: LifeLabNoteMetadata): boolean {
  return Object.keys(metadata).length > 0;
}

export function parseLifeLabFrontmatter(content: string): ParsedLifeLabMarkdown {
  const match = content.match(FRONTMATTER_PATTERN);

  if (!match) {
    return {
      metadata: {},
      body: content,
      technicalProvenance: [],
    };
  }

  const raw = parseYamlFrontmatter(match[1]);
  const metadata = normalizeMetadata(raw);
  const technicalProvenance = extractFrontmatterTechnicalNotes(raw);

  return {
    metadata,
    body: content.slice(match[0].length).replace(/^\s+/, ""),
    technicalProvenance,
  };
}
