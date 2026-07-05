export function isLifeLabDevToolsEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function lifeLabDebugRawUrl(
  sectionId: string,
  slug: string,
): string {
  const params = new URLSearchParams({ section: sectionId, slug });
  return `/life-lab/debug/raw?${params.toString()}`;
}

export function lifeLabDebugDownloadUrl(
  sectionId: string,
  slug: string,
): string {
  const params = new URLSearchParams({ section: sectionId, slug });
  return `/life-lab/debug/download?${params.toString()}`;
}

export function lifeLabNoteRefreshUrl(
  sectionId: string,
  slug: string,
): string {
  return `/life-lab/${sectionId}/${slug}?refresh=1`;
}
