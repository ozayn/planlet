import type { LifeLabNoteImage, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { isSafeHttpUrl, normalizeSourceUrl } from "@/lib/life-lab/source-url";

const IMAGE_STRING_FIELDS = [
  "title",
  "source",
  "license",
  "credit",
  "alt",
] as const satisfies readonly (keyof Omit<LifeLabNoteImage, "url">)[];

export type ResolvedLifeLabNoteImage = LifeLabNoteImage & {
  source: "image" | "youtube_thumbnail";
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
  source: ResolvedLifeLabNoteImage["source"],
): ResolvedLifeLabNoteImage | null {
  if (!image?.url || !isSafeHttpUrl(image.url)) {
    return null;
  }

  return {
    ...image,
    source,
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

export function buildLifeLabImageCaption(image: LifeLabNoteImage): string | null {
  const parts = [image.title, image.credit, image.license].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function lifeLabNoteImageAlt(
  image: LifeLabNoteImage,
  options: { fallbackTitle?: string | null; isYoutubeThumbnail?: boolean } = {},
): string {
  return (
    image.alt?.trim() ||
    image.title?.trim() ||
    options.fallbackTitle?.trim() ||
    (options.isYoutubeThumbnail ? "Video thumbnail" : "Note image")
  );
}
