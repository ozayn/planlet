import { LifeLabPlaylistVideoNav } from "@/components/life-lab/life-lab-playlist-video-nav";
import { getYoutubeVideoPlaylistNavigation } from "@/lib/life-lab";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";

type LifeLabNotePlaylistNavSlotProps = {
  sectionId: LifeLabSectionId;
  slug: string;
};

/** Secondary playlist prev/next — streamed after primary note paint. */
export async function LifeLabNotePlaylistNavSlot({
  sectionId,
  slug,
}: LifeLabNotePlaylistNavSlotProps) {
  const playlistNav = await getYoutubeVideoPlaylistNavigation(sectionId, slug);

  if (!playlistNav) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-border/50 pt-5">
      <LifeLabPlaylistVideoNav navigation={playlistNav} variant="footer" />
    </div>
  );
}
