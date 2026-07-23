import {
  BookOpen,
  Camera,
  Film,
  Landmark,
  Layers3,
  Mic2,
  Network,
  Newspaper,
  NotebookTabs,
  PlaySquare,
  type LucideIcon,
} from "lucide-react";

import type { LifeLabSectionId } from "@/lib/life-lab/constants";

/** Centralized monochrome icons for Life Lab section cards. */
export const lifeLabSectionIconMap: Record<LifeLabSectionId, LucideIcon> = {
  "youtube-learning": PlaySquare,
  "art-history": Landmark,
  "learning-map": Network,
  photography: Camera,
  "reading-briefs": Newspaper,
  "learning-dictionary": BookOpen,
  "film-lab": Film,
  "lecture-notes": NotebookTabs,
  podcasts: Mic2,
  flashcards: Layers3,
};

export function getLifeLabSectionIcon(
  sectionId: LifeLabSectionId,
): LucideIcon {
  return lifeLabSectionIconMap[sectionId];
}
