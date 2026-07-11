const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function isYouTubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(value.trim());
}

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  if (isYouTubeVideoId(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";

      return isYouTubeVideoId(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const fromQuery = parsed.searchParams.get("v");

      if (fromQuery && isYouTubeVideoId(fromQuery)) {
        return fromQuery;
      }

      const segments = parsed.pathname.split("/").filter(Boolean);
      const marker = segments[0]?.toLowerCase();

      if (marker === "shorts" || marker === "embed" || marker === "live") {
        const id = segments[1] ?? "";

        return isYouTubeVideoId(id) ? id : null;
      }
    }
  } catch {
    // Fall through to regex matching for partial URLs.
  }

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);

    if (match?.[1] && isYouTubeVideoId(match[1])) {
      return match[1];
    }
  }

  return null;
}

export function youtubeThumbnailUrlFromVideoId(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** @deprecated Use extractYouTubeVideoId */
export function youtubeVideoIdFromUrl(url: string): string | null {
  return extractYouTubeVideoId(url);
}
