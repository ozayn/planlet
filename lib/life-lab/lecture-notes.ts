import { markdownExcerpt } from "@/lib/life-lab/slug";
import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import {
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
} from "@/lib/life-lab/sections";

const SHORT_VERSION_TITLES = new Set(["short version", "at a glance"]);

const TRANSCRIPT_NOTES_TITLES = new Set([
  "transcript notes",
  "transcript note",
  "notes on the transcript",
]);

const ORIGINAL_NOTES_TITLES = new Set([
  "original notes",
  "full transcript / original notes",
  "full transcript/original notes",
]);

/** Folders under lecture-notes that Planlet never surfaces. */
const LECTURE_NOTES_BLOCKED_FOLDER_SEGMENTS = new Set([
  "private",
  "personal",
  "hidden",
  "archive",
  "therapy-prep",
  "health-notes",
  "social-energy",
  "daily-notes",
  "conversations",
]);

const REDUNDANT_LECTURE_TAG_KEYS = new Set([
  "audio-note",
  "audio",
  "lecture-notes",
  "lecture notes",
  "lecture",
  "zoom",
  "transcript",
  "zoom transcript",
]);

export type LectureNotePrivacyClassification =
  | "public"
  | "private"
  | "uncertain";

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").trim().replace(/^\.\//, "");
}

function pathSegments(relativePath: string): string[] {
  return normalizeRelativePath(relativePath)
    .toLowerCase()
    .split("/")
    .filter(Boolean);
}

export function isLectureNotesSectionId(sectionId: string | undefined): boolean {
  return sectionId === "lecture-notes";
}

export function isAudioNoteMetadata(
  metadata: LifeLabNoteMetadata | undefined,
): boolean {
  if (!metadata) {
    return false;
  }

  const type = metadata.type?.trim().toLowerCase();
  const source = metadata.source?.trim().toLowerCase();

  return type === "audio-note" || source === "audio";
}

export function isZoomTranscriptNote(input: {
  relativePath?: string;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  const inputSource = input.metadata?.input_source?.trim().toLowerCase();
  if (inputSource === "zoom") {
    return true;
  }

  const source = input.metadata?.source?.trim().toLowerCase();
  const underZoom = pathSegments(input.relativePath ?? "").includes("zoom");

  return underZoom && (source === "transcript" || !source);
}

export function lectureNoteSourceLabel(input: {
  relativePath?: string;
  metadata?: LifeLabNoteMetadata;
}): string | null {
  if (isZoomTranscriptNote(input)) {
    return "Zoom transcript";
  }

  if (isAudioNoteMetadata(input.metadata)) {
    return "Audio note";
  }

  return null;
}

export function isLectureNote(input: {
  sectionId?: string;
  relativePath?: string;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  if (isLectureNotesSectionId(input.sectionId)) {
    return true;
  }

  if (input.metadata?.section?.trim().toLowerCase() === "lecture-notes") {
    return true;
  }

  if (isAudioNoteMetadata(input.metadata)) {
    return true;
  }

  if (isZoomTranscriptNote(input)) {
    return true;
  }

  const path = input.relativePath?.toLowerCase() ?? "";
  return (
    path.includes("/lecture-notes/") ||
    path.startsWith("lecture-notes/") ||
    path.includes("lecture-notes\\")
  );
}

export function isShortVersionSectionTitle(title: string): boolean {
  return SHORT_VERSION_TITLES.has(title.trim().toLowerCase());
}

export function isTranscriptNotesSectionTitle(title: string): boolean {
  return TRANSCRIPT_NOTES_TITLES.has(title.trim().toLowerCase());
}

export function isOriginalNotesSectionTitle(title: string): boolean {
  return ORIGINAL_NOTES_TITLES.has(title.trim().toLowerCase());
}

/** Sections that stay collapsed by default on lecture note detail pages. */
export function isLectureNotesCollapsibleSectionTitle(title: string): boolean {
  return (
    isTranscriptNotesSectionTitle(title) || isOriginalNotesSectionTitle(title)
  );
}

export function resolveLectureNotePrivacy(
  metadata: LifeLabNoteMetadata | undefined,
): LectureNotePrivacyClassification | null {
  if (!metadata) {
    return null;
  }

  const raw =
    metadata.privacy?.trim() ||
    metadata.privacy_classification?.trim() ||
    "";

  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();

  if (normalized === "public" || normalized === "open") {
    return "public";
  }

  if (
    normalized === "private" ||
    normalized === "confidential" ||
    normalized === "restricted"
  ) {
    return "private";
  }

  if (
    normalized === "uncertain" ||
    normalized === "unknown" ||
    normalized === "needs-review" ||
    normalized === "needs_review"
  ) {
    return "uncertain";
  }

  return null;
}

export function isLectureNotesBlockedRelativePath(relativePath: string): boolean {
  const segments = pathSegments(relativePath);

  return segments.some((segment) =>
    LECTURE_NOTES_BLOCKED_FOLDER_SEGMENTS.has(segment),
  );
}

export function isLectureNotesPlanletVisibleRelativePath(
  relativePath: string,
): boolean {
  if (!relativePath.trim()) {
    return true;
  }

  return !isLectureNotesBlockedRelativePath(relativePath);
}

export function shouldIncludeLectureNoteInPlanlet(input: {
  sectionId?: string;
  relativePath?: string;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  const relativePath = input.relativePath ?? "";

  if (relativePath && !isLectureNotesPlanletVisibleRelativePath(relativePath)) {
    return false;
  }

  if (input.sectionId && isLifeLabSectionBlocked(input.sectionId)) {
    return false;
  }

  const privacy = resolveLectureNotePrivacy(input.metadata);

  if (privacy !== "private" && privacy !== "uncertain") {
    return true;
  }

  // Private/uncertain notes only when they live in an allowed Planlet-visible folder.
  if (input.sectionId) {
    return (
      isLifeLabSectionId(input.sectionId) &&
      !isLifeLabSectionBlocked(input.sectionId)
    );
  }

  // Without a section id, allow only clearly lecture-notes-visible paths (e.g. zoom/).
  return isLectureNotesPlanletVisibleRelativePath(relativePath || "note.md");
}

function extractH2Section(
  body: string,
  matcher: (title: string) => boolean,
): string | null {
  const regex = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(regex)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const title = match[1]?.trim() ?? "";

    if (!matcher(title)) {
      continue;
    }

    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    const content = body.slice(start, end).trim();

    return content || null;
  }

  return null;
}

export function extractLectureNotePreview(body: string): string {
  const shortVersion = extractH2Section(body, isShortVersionSectionTitle);

  if (shortVersion) {
    return markdownExcerpt(shortVersion, 140);
  }

  return "";
}

export function lectureNoteSemanticTags(
  metadata: LifeLabNoteMetadata | undefined,
): string[] {
  if (!metadata) {
    return [];
  }

  const candidates = [
    ...(metadata.topics ?? []),
    ...(metadata.tags ?? []),
  ];
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const candidate of candidates) {
    const key = candidate.trim().toLowerCase();

    if (!key || seen.has(key) || REDUNDANT_LECTURE_TAG_KEYS.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(candidate.trim());
  }

  return tags;
}
