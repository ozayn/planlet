import { revalidateTag } from "next/cache";

import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  tagsInvalidatedByHomeRefresh,
  tagsInvalidatedByNoteRefresh,
  tagsInvalidatedByPlaylistRefresh,
  tagsInvalidatedBySectionRefresh,
} from "@/lib/life-lab/cache";

export function invalidateLifeLabSectionsCache(): void {
  for (const tag of tagsInvalidatedByHomeRefresh()) {
    revalidateTag(tag, "max");
  }
}

export function invalidateLifeLabSectionCache(sectionId: LifeLabSectionId): void {
  for (const tag of tagsInvalidatedBySectionRefresh(sectionId)) {
    revalidateTag(tag, "max");
  }
}

export function invalidateLifeLabNoteCaches(input: {
  fileId: string;
  sectionId?: LifeLabSectionId;
  playlistSlug?: string;
}): void {
  for (const tag of tagsInvalidatedByNoteRefresh(input)) {
    revalidateTag(tag, "max");
  }
}

export function invalidateLifeLabPlaylistCache(
  sectionId: LifeLabSectionId,
  playlistSlug: string,
): void {
  for (const tag of tagsInvalidatedByPlaylistRefresh(sectionId, playlistSlug)) {
    revalidateTag(tag, "max");
  }
}
