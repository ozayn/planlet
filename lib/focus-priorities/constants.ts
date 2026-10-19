export const MAX_FOCUS_PRIORITY_TITLE_LENGTH = 80;
export const MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH = 160;
export const MAX_FOCUS_PRIORITY_DESCRIPTION_LENGTH = 600;
export const MAX_FOCUS_PRIORITIES_PER_USER = 80;

export type FocusPrioritySeed = {
  title: string;
  lifeAreaName: string;
  description: string;
  suggestedTaskTitle: string;
  defaultDurationMinutes: number | null;
  subtopics: readonly string[];
  /** Default for new seeds only; user preference is never overwritten on sync. */
  autoAddToDailyPlan: boolean;
  archived: boolean;
};

/**
 * Canonical admin Focus Priorities (6 active + 1 archived).
 * Seeded / consolidated idempotently; never overwrites customized rows.
 */
export const CANONICAL_FOCUS_PRIORITY_SEEDS: readonly FocusPrioritySeed[] = [
  {
    title: "Applications",
    lifeAreaName: "Career & Professional Life",
    description:
      "Find suitable roles, tailor and submit applications, and track next steps.",
    suggestedTaskTitle: "Tailor and submit one relevant application.",
    defaultDurationMinutes: null,
    subtopics: [],
    autoAddToDailyPlan: false,
    archived: false,
  },
  {
    title: "Networking & Follow-ups",
    lifeAreaName: "Career & Professional Life",
    description:
      "Maintain useful conversations, pursue referrals, and handle recruiter and application follow-ups.",
    suggestedTaskTitle: "Spend 30 minutes on selected replies and outreach.",
    defaultDurationMinutes: 30,
    subtopics: [],
    autoAddToDailyPlan: false,
    archived: false,
  },
  {
    title: "Technical Practice",
    lifeAreaName: "Learning & Growth",
    description:
      "Practice SQL, Python, statistics/experimentation, machine learning, and analytical cases. Rotate topics, emphasizing weaknesses and upcoming interviews.",
    suggestedTaskTitle: "Practice SQL for 35 minutes and review mistakes.",
    defaultDurationMinutes: 35,
    subtopics: [
      "SQL",
      "Python",
      "Statistics & Experimentation",
      "Machine Learning",
      "Analytical Case Studies",
    ],
    autoAddToDailyPlan: false,
    archived: false,
  },
  {
    title: "Interview Stories & Mock Practice",
    lifeAreaName: "Career & Professional Life",
    description:
      "Rehearse behavioral answers, explain healthcare and project work, and practice communicating decisions, evidence, and limitations.",
    suggestedTaskTitle: "Rehearse one project explanation aloud.",
    defaultDurationMinutes: null,
    subtopics: [],
    autoAddToDailyPlan: false,
    archived: false,
  },
  {
    title: "Shoulder physical therapy",
    lifeAreaName: "Health & Wellbeing",
    description: "Ongoing shoulder physical therapy practice.",
    suggestedTaskTitle: "Do shoulder physical therapy exercises",
    defaultDurationMinutes: null,
    subtopics: [],
    autoAddToDailyPlan: true,
    archived: false,
  },
  {
    title: "Foot physical therapy",
    lifeAreaName: "Health & Wellbeing",
    description: "Ongoing foot physical therapy practice.",
    suggestedTaskTitle: "Do foot physical therapy exercises",
    defaultDurationMinutes: null,
    subtopics: [],
    autoAddToDailyPlan: true,
    archived: false,
  },
  {
    title: "Portfolio Polish",
    lifeAreaName: "Projects & Creativity",
    description:
      "Make a specific documentation, evaluation, or presentation improvement that supports an application or interview.",
    suggestedTaskTitle: "Polish one portfolio artifact for an application.",
    defaultDurationMinutes: null,
    subtopics: [],
    autoAddToDailyPlan: false,
    archived: true,
  },
] as const;

/** @deprecated Use CANONICAL_FOCUS_PRIORITY_SEEDS */
export const DEFAULT_FOCUS_PRIORITY_SEEDS = CANONICAL_FOCUS_PRIORITY_SEEDS;

/**
 * Exact previous initial defaults (title + suggested task).
 * Only rows matching both fields are safe to consolidate away.
 */
export const LEGACY_FOCUS_PRIORITY_DEFAULTS: readonly {
  title: string;
  suggestedTaskTitle: string;
}[] = [
  {
    title: "Job applications",
    suggestedTaskTitle: "Job applications — 30 minutes",
  },
  {
    title: "LinkedIn networking",
    suggestedTaskTitle: "LinkedIn networking — 30 minutes",
  },
  {
    title: "Recruiter follow-ups",
    suggestedTaskTitle: "Recruiter follow-ups — 30 minutes",
  },
  {
    title: "Interview preparation",
    suggestedTaskTitle: "Interview preparation — 30 minutes",
  },
  {
    title: "SQL",
    suggestedTaskTitle: "Practice SQL — 30 minutes",
  },
  {
    title: "Python",
    suggestedTaskTitle: "Practice Python — 30 minutes",
  },
  {
    title: "Statistics",
    suggestedTaskTitle: "Practice Statistics — 30 minutes",
  },
  {
    title: "Machine Learning",
    suggestedTaskTitle: "Practice Machine Learning — 30 minutes",
  },
  {
    title: "Data Science case studies",
    suggestedTaskTitle: "Practice Data Science case studies — 30 minutes",
  },
] as const;

export type FocusPriorityConsolidationPlan = {
  deleteIds: string[];
  createSeeds: FocusPrioritySeed[];
  syncIds: string[];
  ambiguous: Array<{ id: string; title: string; reason: string }>;
};

export function isExactLegacyFocusPriorityDefault(priority: {
  title: string;
  suggestedTaskTitle: string;
}): boolean {
  return LEGACY_FOCUS_PRIORITY_DEFAULTS.some(
    (legacy) =>
      legacy.title === priority.title &&
      legacy.suggestedTaskTitle === priority.suggestedTaskTitle,
  );
}

export function findCanonicalFocusPrioritySeed(
  title: string,
): FocusPrioritySeed | undefined {
  return CANONICAL_FOCUS_PRIORITY_SEEDS.find((seed) => seed.title === title);
}

/** True when the row still looks like an unedited canonical seed. */
export function isUncustomizedCanonicalFocusPriority(
  priority: {
    title: string;
    suggestedTaskTitle: string;
  },
  seed: FocusPrioritySeed,
): boolean {
  return (
    priority.title === seed.title &&
    priority.suggestedTaskTitle === seed.suggestedTaskTitle
  );
}

/**
 * Plan idempotent consolidation: remove exact legacy defaults, create missing
 * canonical seeds, sync uncustomized canonical rows. Never touches ambiguous
 * or clearly customized priorities.
 */
export function planFocusPriorityConsolidation(
  existing: Array<{
    id: string;
    title: string;
    suggestedTaskTitle: string;
  }>,
): FocusPriorityConsolidationPlan {
  const deleteIds: string[] = [];
  const ambiguous: FocusPriorityConsolidationPlan["ambiguous"] = [];
  const remainingTitles = new Set<string>();

  for (const priority of existing) {
    if (isExactLegacyFocusPriorityDefault(priority)) {
      deleteIds.push(priority.id);
      continue;
    }

    const legacyTitleHit = LEGACY_FOCUS_PRIORITY_DEFAULTS.some(
      (legacy) => legacy.title === priority.title,
    );
    if (legacyTitleHit) {
      ambiguous.push({
        id: priority.id,
        title: priority.title,
        reason:
          "Legacy default title with a customized suggested task — left unchanged.",
      });
    }

    remainingTitles.add(priority.title);
  }

  const createSeeds = CANONICAL_FOCUS_PRIORITY_SEEDS.filter(
    (seed) => !remainingTitles.has(seed.title),
  );

  const syncIds: string[] = [];
  for (const priority of existing) {
    if (deleteIds.includes(priority.id)) {
      continue;
    }
    const seed = findCanonicalFocusPrioritySeed(priority.title);
    if (!seed) {
      continue;
    }
    if (isUncustomizedCanonicalFocusPriority(priority, seed)) {
      syncIds.push(priority.id);
    }
  }

  return { deleteIds, createSeeds, syncIds, ambiguous };
}

export function defaultSuggestedTaskTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  return `Practice ${trimmed} — 30 minutes`;
}

export function parseSubtopicsInput(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(/\n|,/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 12);
}

export function formatSubtopicsInput(subtopics: readonly string[]): string {
  return subtopics.join("\n");
}
