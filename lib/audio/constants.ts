export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/x-aac",
]);

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "audio/webm":
      return "webm";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/m4a":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/aac":
    case "audio/x-aac":
      return "aac";
    default:
      return "audio";
  }
}

export function normalizeAudioMimeType(mimeType: string): string | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!base) return null;
  if (ALLOWED_AUDIO_MIME_TYPES.has(base)) {
    return base === "audio/m4a" ? "audio/mp4" : base;
  }
  return null;
}
