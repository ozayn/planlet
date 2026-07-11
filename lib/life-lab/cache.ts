import type { LifeLabSectionId } from "@/lib/life-lab/constants";

export const LIFE_LAB_CACHE_TAG = "life-lab";
export const LIFE_LAB_SECTIONS_CACHE_TAG = "life-lab:sections";

export function lifeLabSectionCacheTag(sectionId: string): string {
  return `life-lab:section:${sectionId}`;
}

export function lifeLabNoteCacheTag(fileId: string): string {
  return `life-lab:note:${fileId}`;
}

export function lifeLabPlaylistCacheTag(
  sectionId: string,
  playlistSlug: string,
): string {
  return `life-lab:playlist:${sectionId}:${playlistSlug}`;
}

export function getLifeLabListCacheSeconds(): number {
  const fromEnv = Number.parseInt(
    process.env.LIFE_LAB_LIST_CACHE_SECONDS ?? "",
    10,
  );

  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  return process.env.NODE_ENV === "development" ? 30 : 1800;
}

export function getLifeLabNoteCacheSeconds(): number {
  const fromEnv = Number.parseInt(
    process.env.LIFE_LAB_NOTE_CACHE_SECONDS ?? "",
    10,
  );

  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  return process.env.NODE_ENV === "development" ? 30 : 3600;
}

export function getLifeLabCacheSeconds(): number {
  return getLifeLabListCacheSeconds();
}

export function lifeLabCacheExpiresAt(
  loadedAt: string,
  ttlSeconds: number,
): string {
  return new Date(
    new Date(loadedAt).getTime() + ttlSeconds * 1000,
  ).toISOString();
}

export function canUseLifeLabRefreshBypass(
  refresh: string | undefined,
  isAuthorized: boolean,
): boolean {
  if (refresh !== "1" || !isAuthorized) {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

export type LifeLabRefreshResult =
  | { ok: true; message: string }
  | { ok: false; message: string; stale: true };

export function lifeLabRefreshSuccessMessage(): string {
  return "Updated";
}

export function lifeLabRefreshFailureMessage(): string {
  return "Couldn't refresh right now. Showing the cached version.";
}

export function tagsInvalidatedByHomeRefresh(): string[] {
  return [LIFE_LAB_SECTIONS_CACHE_TAG, LIFE_LAB_CACHE_TAG];
}

export function tagsInvalidatedBySectionRefresh(
  sectionId: LifeLabSectionId,
): string[] {
  return [lifeLabSectionCacheTag(sectionId)];
}

export function tagsInvalidatedByNoteRefresh(input: {
  fileId: string;
  sectionId?: LifeLabSectionId;
  playlistSlug?: string;
}): string[] {
  const tags = [lifeLabNoteCacheTag(input.fileId)];

  if (input.sectionId) {
    tags.push(lifeLabSectionCacheTag(input.sectionId));
  }

  if (input.sectionId && input.playlistSlug) {
    tags.push(lifeLabPlaylistCacheTag(input.sectionId, input.playlistSlug));
  }

  return tags;
}

export function tagsInvalidatedByPlaylistRefresh(
  sectionId: LifeLabSectionId,
  playlistSlug: string,
): string[] {
  return [
    lifeLabPlaylistCacheTag(sectionId, playlistSlug),
    lifeLabSectionCacheTag(sectionId),
  ];
}

export function toLifeLabRefreshFailureResult(): LifeLabRefreshResult {
  return {
    ok: false,
    message: lifeLabRefreshFailureMessage(),
    stale: true,
  };
}
