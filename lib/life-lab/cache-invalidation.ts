import { revalidateTag } from "next/cache";

import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  lifeLabPlaylistAssetCacheTag,
  lifeLabPlaylistAssetsCacheTag,
  lifeLabPlaylistLearningMapCacheTag,
  tagsInvalidatedByHomeRefresh,
  tagsInvalidatedByNoteRefresh,
  tagsInvalidatedByPlaylistRefresh,
  tagsInvalidatedBySectionRefresh,
} from "@/lib/life-lab/cache";
import type { PlaylistAssetId } from "@/lib/life-lab/playlist-assets";

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

export function invalidateLifeLabPlaylistLearningMapCache(
  playlistId: string,
): void {
  revalidateTag(lifeLabPlaylistLearningMapCacheTag(playlistId), "max");
}

export function invalidateLifeLabPlaylistAssetCache(
  playlistId: string,
  assetId: PlaylistAssetId,
): void {
  revalidateTag(lifeLabPlaylistAssetCacheTag(playlistId, assetId), "max");
}

export function invalidateLifeLabPlaylistAssetsCache(
  playlistId: string,
): void {
  revalidateTag(lifeLabPlaylistAssetsCacheTag(playlistId), "max");
}
