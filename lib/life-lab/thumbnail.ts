import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { resolvePlaylistCardThumbnail } from "@/lib/life-lab/playlist-thumbnail";
import { resolvePlaylistVideoRowThumbnail } from "@/lib/life-lab/playlist-video-thumbnail";

export {
  extractYouTubeVideoId,
  youtubeThumbnailUrlFromVideoId,
} from "@/lib/life-lab/youtube-video-id";

export function resolveLifeLabThumbnail(
  note: Pick<LifeLabNoteSummary, "title" | "metadata">,
): ResolvedLifeLabNoteImage | null {
  const metadata = note.metadata;

  return resolvePlaylistVideoRowThumbnail({
    metadata,
    videoUrl:
      metadata?.sourceUrl ??
      metadata?.source_url ??
      metadata?.youtubeUrl ??
      metadata?.youtube_url ??
      metadata?.video_url ??
      null,
    title: note.title,
  });
}

export function resolvePlaylistThumbnail(input: {
  indexNote: LifeLabNoteSummary;
  contentNotes: LifeLabNoteSummary[];
  playlistUrl?: string | null;
}): ResolvedLifeLabNoteImage | null {
  return resolvePlaylistCardThumbnail(input);
}
