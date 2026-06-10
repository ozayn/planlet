/** Server max after client-side preparation. */
export const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Allow large camera photos in the picker; they are resized before upload. */
export const PICKER_MAX_IMAGE_BYTES = 30 * 1024 * 1024;

export const MAX_IMAGE_DIMENSION = 1600;

export const IMAGE_QUALITY_DEFAULT = 0.82;

export const IMAGE_QUALITY_MIN = 0.65;

/** Target compressed size before upload. */
export const IMAGE_TARGET_MAX_BYTES = 3 * 1024 * 1024;

export const EXTRACTION_TIMEOUT_MS = 40_000;

export const SLOW_EXTRACTION_HINT_MS = 10_000;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Accepted in file pickers; server may reject HEIC/HEIF if the provider cannot read them. */
export const PICKER_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeImageMimeType(mimeType: string): string | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!base) return null;

  if (base === "image/jpg") {
    return "image/jpeg";
  }

  if (ALLOWED_IMAGE_MIME_TYPES.has(base)) {
    return base;
  }

  return null;
}

export function extensionForImageMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
}
