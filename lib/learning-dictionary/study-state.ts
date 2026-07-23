/**
 * Per-user Learning Dictionary study states (Planlet DB, not Drive).
 * Canonical values stored on LifeLabItemState.studyStatus.
 */
export const DICTIONARY_STUDY_STATUSES = [
  "new",
  "learning",
  "known",
  "revisit",
] as const;

export type DictionaryStudyStatus =
  (typeof DICTIONARY_STUDY_STATUSES)[number];

export const DICTIONARY_STUDY_STATUS_LABELS: Record<
  DictionaryStudyStatus,
  string
> = {
  new: "New",
  learning: "Learning",
  known: "Known",
  revisit: "Revisit",
};

/** Browse / Learn filter chips (includes All). */
export const DICTIONARY_STUDY_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "learning", label: "Learning" },
  { id: "known", label: "Known" },
  { id: "revisit", label: "Revisit" },
] as const;

export type DictionaryStudyStatusFilterId =
  (typeof DICTIONARY_STUDY_STATUS_FILTERS)[number]["id"];

export function isDictionaryStudyStatus(
  value: string,
): value is DictionaryStudyStatus {
  return (DICTIONARY_STUDY_STATUSES as readonly string[]).includes(value);
}

export function dictionaryStudyStatusLabel(
  status: DictionaryStudyStatus,
): string {
  return DICTIONARY_STUDY_STATUS_LABELS[status];
}

/**
 * Map Drive frontmatter study_status onto dictionary Learn statuses.
 * User DB state always wins when present.
 */
export function mapDriveStudyStatusToDictionary(
  raw: string | null | undefined,
): DictionaryStudyStatus | null {
  if (!raw?.trim()) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();

  if (isDictionaryStudyStatus(normalized)) {
    return normalized;
  }

  switch (normalized) {
    case "studying":
      return "learning";
    case "learned":
      return "known";
    case "reviewed":
      return "learning";
    default:
      return null;
  }
}

export function resolveDictionaryStudyStatus(input: {
  userStatus?: string | null;
  driveStatus?: string | null;
}): DictionaryStudyStatus {
  if (input.userStatus && isDictionaryStudyStatus(input.userStatus)) {
    return input.userStatus;
  }

  return mapDriveStudyStatusToDictionary(input.driveStatus) ?? "new";
}

/** Prefer user map, then Drive metadata string, else New. */
export function resolveDictionaryStudyStatusForItem(input: {
  itemKey: string;
  userStatusByKey?: ReadonlyMap<string, string> | null;
  driveStatus?: string | null;
}): DictionaryStudyStatus {
  const userStatus = input.userStatusByKey?.get(input.itemKey) ?? null;
  return resolveDictionaryStudyStatus({
    userStatus,
    driveStatus: input.driveStatus,
  });
}

export type DictionaryStudyAction = "not-yet" | "learning" | "know" | "revisit" | "reset";

export function nextDictionaryStudyStatus(
  action: DictionaryStudyAction,
): DictionaryStudyStatus {
  switch (action) {
    case "not-yet":
    case "learning":
      return "learning";
    case "know":
      return "known";
    case "revisit":
      return "revisit";
    case "reset":
      return "new";
    default:
      return "learning";
  }
}

/** Session queue priority: Revisit → Learning → New (Known only when reviewing known). */
export const DICTIONARY_SESSION_PRIORITY: Record<DictionaryStudyStatus, number> =
  {
    revisit: 0,
    learning: 1,
    new: 2,
    known: 3,
  };

export const DICTIONARY_SESSION_SIZES = [5, 10, 20] as const;

export type DictionarySessionSize = (typeof DICTIONARY_SESSION_SIZES)[number] | "all" | "due";
