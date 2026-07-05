import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";

export const LIFE_LAB_STUDY_STATUSES = [
  "new",
  "reviewed",
  "studying",
  "learned",
  "revisit",
] as const;

export type LifeLabStudyStatus = (typeof LIFE_LAB_STUDY_STATUSES)[number];

const STUDY_STATUS_LABELS: Record<LifeLabStudyStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  studying: "Studying",
  learned: "Learned",
  revisit: "Revisit",
};

export function isLifeLabStudyStatus(value: string): value is LifeLabStudyStatus {
  return (LIFE_LAB_STUDY_STATUSES as readonly string[]).includes(value);
}

export function studyStatusLabel(status: LifeLabStudyStatus): string {
  return STUDY_STATUS_LABELS[status];
}

export function resolveStudyStatusValue(
  metadata?: LifeLabNoteMetadata,
): LifeLabStudyStatus | null {
  if (!metadata) {
    return null;
  }

  const rawStatus = metadata.study_status?.trim().toLowerCase();

  if (rawStatus && isLifeLabStudyStatus(rawStatus)) {
    return rawStatus;
  }

  if (metadata.reviewed === true) {
    return "reviewed";
  }

  if (metadata.reviewed === false) {
    return "new";
  }

  return null;
}

export function resolveStudyStatusLabel(
  metadata?: LifeLabNoteMetadata,
): string | null {
  const status = resolveStudyStatusValue(metadata);

  return status ? studyStatusLabel(status) : null;
}

export function noteShowsFlashcardAction(note: {
  hasFlashcards?: boolean;
  flashcardCount?: number;
}): boolean {
  return Boolean(note.hasFlashcards && (note.flashcardCount ?? 0) > 0);
}
