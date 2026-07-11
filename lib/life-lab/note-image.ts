import type { LifeLabNoteImage, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { VISUAL_ANCHOR_SECTION_TITLE } from "@/lib/life-lab/hidden-markdown-sections";
import { listReadingBriefH2Sections } from "@/lib/life-lab/reading-briefs";
import { isSafeHttpUrl, normalizeSourceUrl } from "@/lib/life-lab/source-url";

const IMAGE_STRING_FIELDS = [
  "title",
  "source",
  "license",
  "credit",
  "alt",
] as const satisfies readonly (keyof Omit<LifeLabNoteImage, "url">)[];

const CAPTION_NOISE_PATTERNS = [
  /for preview use only/i,
  /fallback visual anchor/i,
];

export type ResolvedLifeLabNoteImage = LifeLabNoteImage & {
  kind: "image" | "youtube_thumbnail";
};

export type LifeLabImageDetailRow = {
  label: string;
  value: string;
};

export function normalizeLifeLabNoteImage(raw: unknown): LifeLabNoteImage | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const url =
    typeof record.url === "string" ? normalizeSourceUrl(record.url) : null;

  if (!url) {
    return undefined;
  }

  const image: LifeLabNoteImage = { url };

  for (const field of IMAGE_STRING_FIELDS) {
    const value = record[field];

    if (typeof value === "string" && value.trim()) {
      image[field] = value.trim();
    }
  }

  return image;
}

function resolveMetadataImage(
  image: LifeLabNoteImage | undefined,
  kind: ResolvedLifeLabNoteImage["kind"],
): ResolvedLifeLabNoteImage | null {
  if (!image?.url || !isSafeHttpUrl(image.url)) {
    return null;
  }

  return {
    ...image,
    kind,
  };
}

export function resolveLifeLabNoteImage(
  metadata?: LifeLabNoteMetadata | null,
): ResolvedLifeLabNoteImage | null {
  return (
    resolveMetadataImage(metadata?.image, "image") ??
    resolveMetadataImage(metadata?.youtube_thumbnail, "youtube_thumbnail")
  );
}

function isCaptionNoise(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  if (isSafeHttpUrl(trimmed)) {
    return true;
  }

  return CAPTION_NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function compactCaptionField(value: string | undefined): string | null {
  if (!value || isCaptionNoise(value)) {
    return null;
  }

  return value.trim();
}

export function buildLifeLabImageCaption(
  image: ResolvedLifeLabNoteImage,
): string | null {
  if (image.kind === "youtube_thumbnail") {
    return "YouTube thumbnail";
  }

  const title = compactCaptionField(image.title);
  const source = compactCaptionField(image.source);
  const credit = compactCaptionField(image.credit);
  const attribution = [source, credit].filter(Boolean).join(" / ");

  if (title && attribution) {
    return `${title} · ${attribution}`;
  }

  return title ?? attribution ?? null;
}

export function lifeLabNoteImageAlt(
  image: LifeLabNoteImage,
  options: {
    fallbackTitle?: string | null;
    isYoutubeThumbnail?: boolean;
    thumbnailPrefix?: string;
  } = {},
): string {
  if (image.alt?.trim()) {
    return image.alt.trim();
  }

  if (image.title?.trim()) {
    return image.title.trim();
  }

  const title = options.fallbackTitle?.trim();

  if (title && options.thumbnailPrefix) {
    return `${options.thumbnailPrefix} ${title}`;
  }

  if (title) {
    return title;
  }

  return options.isYoutubeThumbnail ? "Video thumbnail" : "Note image";
}

export function extractVisualAnchorSection(body: string): string | null {
  const section = listReadingBriefH2Sections(body).find(
    (item) =>
      item.title.trim().toLowerCase() ===
      VISUAL_ANCHOR_SECTION_TITLE.toLowerCase(),
  );

  const content = section?.content.trim();

  return content ? content : null;
}

export function collectLifeLabImageDetailRows(input: {
  metadata?: LifeLabNoteMetadata | null;
  visualAnchorContent?: string | null;
}): LifeLabImageDetailRow[] {
  const resolved = resolveLifeLabNoteImage(input.metadata);

  if (!resolved) {
    return [];
  }

  const primary =
    resolved.kind === "image"
      ? input.metadata?.image
      : input.metadata?.youtube_thumbnail;
  const rows: LifeLabImageDetailRow[] = [];

  if (primary?.title?.trim()) {
    rows.push({ label: "Image title", value: primary.title.trim() });
  }

  if (primary?.source?.trim()) {
    rows.push({ label: "Image source", value: primary.source.trim() });
  }

  if (primary?.credit?.trim()) {
    rows.push({ label: "Credit", value: primary.credit.trim() });
  }

  if (primary?.license?.trim()) {
    rows.push({ label: "License", value: primary.license.trim() });
  }

  rows.push({ label: "Image URL", value: resolved.url });

  const visualAnchorContent = input.visualAnchorContent?.trim();

  if (visualAnchorContent) {
    rows.push({ label: "Why this image", value: visualAnchorContent });
  }

  return rows;
}
