import {
  DICTIONARY_SESSION_PRIORITY,
  type DictionarySessionSize,
  type DictionaryStudyStatus,
} from "@/lib/learning-dictionary/study-state";

export type DictionaryLearnItem = {
  itemKey: string;
  slug: string;
  title: string;
  definition: string;
  example?: string | null;
  translation?: string | null;
  href: string;
  thumbnailUrl?: string | null;
  sourceNoteHref?: string | null;
  sourceNoteLabel?: string | null;
  studyStatus: DictionaryStudyStatus;
  languageId?: string | null;
};

export type BuildDictionaryLearnSessionOptions = {
  size?: DictionarySessionSize;
  /** When true, include Known items (for intentional review). */
  includeKnown?: boolean;
  /** Only Known items (Review known concepts). */
  knownOnly?: boolean;
};

/**
 * Build a calm Learn session queue.
 * Priority: Revisit → Learning → New → Known (only when requested).
 * Avoids duplicate itemKeys within one session.
 */
export function buildDictionaryLearnSession(
  items: DictionaryLearnItem[],
  options: BuildDictionaryLearnSessionOptions = {},
): DictionaryLearnItem[] {
  const size = options.size ?? 10;
  const knownOnly = options.knownOnly === true;
  const includeKnown = knownOnly || options.includeKnown === true;

  let pool = items.filter((item) => item.definition.trim() || item.title.trim());

  if (knownOnly) {
    pool = pool.filter((item) => item.studyStatus === "known");
  } else if (!includeKnown) {
    pool = pool.filter((item) => item.studyStatus !== "known");
  }

  // "due" = revisit + learning + new (same as default exclude known)
  if (size === "due") {
    pool = pool.filter((item) => item.studyStatus !== "known");
  }

  const ranked = [...pool].sort((left, right) => {
    const priorityDiff =
      DICTIONARY_SESSION_PRIORITY[left.studyStatus] -
      DICTIONARY_SESSION_PRIORITY[right.studyStatus];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });

  const seen = new Set<string>();
  const session: DictionaryLearnItem[] = [];

  for (const item of ranked) {
    if (seen.has(item.itemKey)) {
      continue;
    }

    seen.add(item.itemKey);
    session.push(item);

    if (size !== "all" && size !== "due" && session.length >= size) {
      break;
    }
  }

  return session;
}

export function summarizeDictionarySessionResults(
  statuses: DictionaryStudyStatus[],
): { known: number; learning: number; total: number } {
  let known = 0;
  let learning = 0;

  for (const status of statuses) {
    if (status === "known") {
      known += 1;
    } else if (status === "learning" || status === "revisit" || status === "new") {
      learning += 1;
    }
  }

  return { known, learning, total: statuses.length };
}
