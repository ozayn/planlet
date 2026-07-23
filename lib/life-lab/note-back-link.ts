import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import type { PlaylistVideoNavigation } from "@/lib/life-lab/playlist-index";

export function resolveLifeLabNoteBackLink(input: {
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  playlistNav?: PlaylistVideoNavigation | null;
}): { href: string; label: string } {
  if (input.playlistNav) {
    return {
      href: input.playlistNav.playlistIndexHref,
      label: `Back to ${input.playlistNav.playlistTitle}`,
    };
  }

  return {
    href: `/life-lab/${input.sectionId}`,
    label: `Back to ${input.sectionLabel}`,
  };
}
