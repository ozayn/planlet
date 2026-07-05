import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";

export type ParsedLifeLabMarkdown = {
  metadata: LifeLabNoteMetadata;
  body: string;
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

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
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

    if (rawValue === "") {
      currentArrayKey = key;
      result[key] = [];
      continue;
    }

    currentArrayKey = null;
    result[key] = parseYamlValue(rawValue);
  }

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
    "playlist",
    "date",
    "study_status",
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

  const arrayFields = ["topics", "people", "places", "tags"] as const;

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
    };
  }

  const raw = parseYamlFrontmatter(match[1]);
  const metadata = normalizeMetadata(raw);

  return {
    metadata,
    body: content.slice(match[0].length).replace(/^\s+/, ""),
  };
}
