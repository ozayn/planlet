import type { NarrationErrorCategory } from "@/lib/life-lab/narration-errors";

export const NARRATION_AUDIO_MIME = "audio/mpeg";

export type NarrationPlaybackDiagnostic = {
  errorName: string | null;
  errorMessage: string | null;
  srcKind: "blob" | "data" | "remote" | "none";
  responseStatus: number | null;
  responseContentType: string | null;
  byteLength: number;
  readyState: number | null;
  networkState: number | null;
  mediaErrorCode: number | null;
  mediaErrorMessage: string | null;
  playRejected: boolean;
  playRejectionName: string | null;
  playRejectionMessage: string | null;
  fromCache: boolean;
  chunkIndex: number | null;
  chunkSource: "cache" | "fresh" | "unknown";
};

export function classifyAudioSrc(src: string): NarrationPlaybackDiagnostic["srcKind"] {
  if (!src) {
    return "none";
  }

  if (src.startsWith("blob:")) {
    return "blob";
  }

  if (src.startsWith("data:")) {
    return "data";
  }

  return "remote";
}

export function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 3) {
    return false;
  }

  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return true;
  }

  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

export function normalizeNarrationAudioBlob(
  blob: Blob,
  responseContentType?: string | null,
): Blob {
  const resolvedType =
    blob.type ||
    (responseContentType?.split(";")[0]?.trim() ?? "") ||
    NARRATION_AUDIO_MIME;

  if (blob.type === resolvedType) {
    return blob;
  }

  return new Blob([blob], { type: resolvedType });
}

export function validateNarrationAudioBlob(
  blob: Blob,
  responseContentType?: string | null,
): NarrationErrorCategory | null {
  if (blob.size === 0) {
    return "empty_audio_response";
  }

  const mime = blob.type || responseContentType?.split(";")[0]?.trim() || "";

  if (
    mime &&
    !mime.startsWith("audio/") &&
    mime !== "application/octet-stream"
  ) {
    return "unsupported_audio_format";
  }

  return null;
}

const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

export function mapMediaErrorCode(code: number | null | undefined): NarrationErrorCategory {
  switch (code) {
    case MEDIA_ERR_ABORTED:
      return "playback_aborted";
    case MEDIA_ERR_NETWORK:
      return "audio_network_failure";
    case MEDIA_ERR_DECODE:
      return "audio_decode_failure";
    case MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "unsupported_audio_source";
    default:
      return "audio_playback_failure";
  }
}

export function categorizePlaybackFailure(input: {
  playError?: unknown;
  mediaError?: MediaError | null;
  blobSize?: number;
}): NarrationErrorCategory {
  if (input.blobSize === 0) {
    return "empty_audio_response";
  }

  if (input.playError instanceof DOMException) {
    if (input.playError.name === "NotAllowedError") {
      return "playback_requires_user_gesture";
    }

    if (input.playError.name === "NotSupportedError") {
      return "unsupported_audio_format";
    }
  }

  if (input.mediaError?.code) {
    return mapMediaErrorCode(input.mediaError.code);
  }

  return "audio_playback_failure";
}

export function buildPlaybackDiagnostic(input: {
  audio?: HTMLAudioElement | null;
  blob: Blob;
  responseStatus: number;
  responseContentType: string | null;
  fromCache: boolean;
  chunkIndex: number;
  playError?: unknown;
  playRejected?: boolean;
}): NarrationPlaybackDiagnostic {
  const mediaError = input.audio?.error ?? null;
  const playError = input.playError;

  return {
    errorName:
      playError instanceof Error
        ? playError.name
        : mediaError
          ? "MediaError"
          : null,
    errorMessage:
      playError instanceof Error
        ? playError.message
        : mediaError?.message ?? null,
    srcKind: classifyAudioSrc(input.audio?.src ?? ""),
    responseStatus: input.responseStatus,
    responseContentType: input.responseContentType,
    byteLength: input.blob.size,
    readyState: input.audio?.readyState ?? null,
    networkState: input.audio?.networkState ?? null,
    mediaErrorCode: mediaError?.code ?? null,
    mediaErrorMessage: mediaError?.message ?? null,
    playRejected: Boolean(input.playRejected),
    playRejectionName:
      playError instanceof Error ? playError.name : null,
    playRejectionMessage:
      playError instanceof Error ? playError.message : null,
    fromCache: input.fromCache,
    chunkIndex: input.chunkIndex,
    chunkSource: input.fromCache ? "cache" : "fresh",
  };
}

export function logNarrationPlaybackDiagnostic(
  message: string,
  diagnostic: NarrationPlaybackDiagnostic,
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[life-lab-narration-playback]", message, diagnostic);
}

export function waitForAudioCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    function cleanup() {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    }

    function handleCanPlay() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(audio.error ?? new Error("Audio failed to load."));
    }

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
  });
}

export function replaceAudioObjectUrl(input: {
  audio: HTMLAudioElement;
  nextUrl: string;
  activeUrlRef: { current: string | null };
}): void {
  input.audio.pause();

  if (input.activeUrlRef.current) {
    URL.revokeObjectURL(input.activeUrlRef.current);
    input.activeUrlRef.current = null;
  }

  input.audio.src = input.nextUrl;
  input.activeUrlRef.current = input.nextUrl;
  input.audio.load();
}

export function clearAudioSource(input: {
  audio: HTMLAudioElement | null;
  activeUrlRef: { current: string | null };
}): void {
  if (!input.audio) {
    return;
  }

  input.audio.pause();
  input.audio.removeAttribute("src");
  input.audio.load();

  if (input.activeUrlRef.current) {
    URL.revokeObjectURL(input.activeUrlRef.current);
    input.activeUrlRef.current = null;
  }
}
