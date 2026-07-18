import type {
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";

export type LifeLabImagePlacementKind =
  | "podcast-note"
  | "video-note"
  | "reference-note"
  | "other-note";

export type LifeLabImagePlacement = {
  kind: LifeLabImagePlacementKind;
  headerImage: ResolvedLifeLabNoteImage | null;
  leadImage: ResolvedLifeLabNoteImage | null;
};

function normalizeLocalAssetPath(value: string): string {
  const [withoutHash] = value.trim().replace(/\\/g, "/").split("#");
  const segments: string[] = [];

  for (const segment of (withoutHash ?? "").split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.join("/").toLowerCase();
}

export function normalizeLifeLabImageIdentity(value: string): string {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+/g, "/").replace(/\/$/, "");
    return url.toString();
  } catch {
    return normalizeLocalAssetPath(trimmed);
  }
}

export function areLifeLabImagesDuplicate(
  left: ResolvedLifeLabNoteImage | null | undefined,
  right: ResolvedLifeLabNoteImage | null | undefined,
): boolean {
  if (!left?.url || !right?.url) {
    return false;
  }

  return (
    normalizeLifeLabImageIdentity(left.url) ===
    normalizeLifeLabImageIdentity(right.url)
  );
}

export function lifeLabImagePlacementKind(input: {
  sectionId: LifeLabSectionId;
  note: Pick<LifeLabNoteSummary, "relativePath" | "metadata">;
}): LifeLabImagePlacementKind {
  const type = input.note.metadata?.type?.trim().toLowerCase() ?? "";
  const path = input.note.relativePath.replace(/\\/g, "/").toLowerCase();
  const segments = path.split("/").filter(Boolean);

  if (
    input.sectionId === "podcasts" &&
    (segments.includes("episodes") ||
      ["podcast-note", "podcast-episode", "podcast-episode-note"].includes(type))
  ) {
    return "podcast-note";
  }

  if (
    input.sectionId === "youtube-learning" &&
    (segments.includes("videos") ||
      ["video", "video-note", "youtube-video", "youtube-video-note"].includes(
        type,
      ))
  ) {
    return "video-note";
  }

  if (
    type === "reference" ||
    type === "reference-note" ||
    segments.includes("reference") ||
    segments.includes("references")
  ) {
    return "reference-note";
  }

  return "other-note";
}

export function resolveLifeLabImagePlacement(input: {
  sectionId: LifeLabSectionId;
  note: Pick<LifeLabNoteSummary, "relativePath" | "metadata">;
  leadImage: ResolvedLifeLabNoteImage | null;
  headerImage?: ResolvedLifeLabNoteImage | null;
}): LifeLabImagePlacement {
  const kind = lifeLabImagePlacementKind(input);

  if (kind !== "podcast-note") {
    return {
      kind,
      headerImage: null,
      leadImage: input.leadImage,
    };
  }

  const headerImage = input.headerImage ?? input.leadImage;
  const leadImage =
    input.leadImage &&
    headerImage &&
    !areLifeLabImagesDuplicate(input.leadImage, headerImage)
      ? input.leadImage
      : null;

  return { kind, headerImage, leadImage };
}
