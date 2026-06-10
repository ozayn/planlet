export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;

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
