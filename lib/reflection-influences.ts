import { z } from "zod";

export const REFLECTION_INFLUENCE_CATEGORIES = [
  { id: "presence", label: "Presence" },
  { id: "compassion", label: "Compassion" },
  { id: "meaning", label: "Meaning" },
  { id: "everyday_philosophy", label: "Everyday Philosophy" },
  { id: "practical", label: "Practical" },
  { id: "decision_making", label: "Decision Making" },
  { id: "relationships", label: "Relationships" },
] as const;

export type ReflectionInfluenceCategoryId =
  (typeof REFLECTION_INFLUENCE_CATEGORIES)[number]["id"];

export const REFLECTION_INFLUENCE_IDS = [
  "alan_watts",
  "eckhart_tolle",
  "ram_dass",
  "buddhism",
  "vipassana",
  "gabor_mate",
  "tara_brach",
  "kristin_neff",
  "viktor_frankl",
  "alain_de_botton",
  "james_clear",
  "bj_fogg",
  "greg_mckeown",
  "oliver_burkeman",
  "cal_newport",
  "annie_duke",
  "shane_parrish",
  "esther_perel",
] as const;

export type ReflectionInfluenceId = (typeof REFLECTION_INFLUENCE_IDS)[number];

export const MAX_PRIMARY_INFLUENCES = 3;

export type ReflectionInfluence = {
  id: ReflectionInfluenceId;
  label: string;
  category: ReflectionInfluenceCategoryId;
  themes: string;
  /** Optional extra guidance for AI prompting when this lens is selected. */
  promptNotes?: string;
};

export const REFLECTION_INFLUENCES: Record<
  ReflectionInfluenceId,
  ReflectionInfluence
> = {
  alan_watts: {
    id: "alan_watts",
    label: "Alan Watts",
    category: "presence",
    themes:
      "acceptance, playfulness, non-control, uncertainty, flow",
  },
  eckhart_tolle: {
    id: "eckhart_tolle",
    label: "Eckhart Tolle",
    category: "presence",
    themes:
      "presence, awareness, observing thoughts, reducing identification with mental stories",
  },
  ram_dass: {
    id: "ram_dass",
    label: "Ram Dass",
    category: "presence",
    themes: "compassion, service, awareness, spiritual growth",
  },
  buddhism: {
    id: "buddhism",
    label: "Buddhism",
    category: "presence",
    themes:
      "impermanence, non-attachment, mindfulness, suffering and its causes",
  },
  vipassana: {
    id: "vipassana",
    label: "Vipassana",
    category: "presence",
    themes: "observation, equanimity, impermanence, direct experience",
  },
  gabor_mate: {
    id: "gabor_mate",
    label: "Gabor Maté",
    category: "compassion",
    themes:
      "compassion, trauma awareness, unmet needs, mind-body connection, stress",
  },
  tara_brach: {
    id: "tara_brach",
    label: "Tara Brach",
    category: "compassion",
    themes: "radical acceptance, self-compassion, emotional awareness",
  },
  kristin_neff: {
    id: "kristin_neff",
    label: "Kristin Neff",
    category: "compassion",
    themes: "self-compassion, resilience, reducing self-criticism",
  },
  viktor_frankl: {
    id: "viktor_frankl",
    label: "Viktor Frankl",
    category: "meaning",
    themes: "meaning, purpose, responsibility, values",
  },
  alain_de_botton: {
    id: "alain_de_botton",
    label: "Alain de Botton",
    category: "everyday_philosophy",
    themes:
      "emotional maturity, self-understanding, relationships, realistic expectations, work and meaning, loneliness, friendship, identity, modern life, status and success, psychological insight",
    promptNotes:
      "Everyday philosophy focused on relationships, emotional development, work, meaning, expectations, and navigating modern life. You may explore realistic expectations, tensions between achievement and fulfillment, identity and work, friendship and connection, loneliness, emotional maturity, and meaning in ordinary life. Do not refer to any author by name.",
  },
  james_clear: {
    id: "james_clear",
    label: "James Clear",
    category: "practical",
    themes: "systems, habits, environment design, small improvements",
  },
  bj_fogg: {
    id: "bj_fogg",
    label: "BJ Fogg",
    category: "practical",
    themes: "tiny habits, reducing friction, making change easier",
  },
  greg_mckeown: {
    id: "greg_mckeown",
    label: "Greg McKeown",
    category: "practical",
    themes: "essentialism, saying no, less but better, focus",
  },
  oliver_burkeman: {
    id: "oliver_burkeman",
    label: "Oliver Burkeman",
    category: "practical",
    themes:
      "finite time, choosing what matters, realistic prioritization, acceptance of limits",
  },
  cal_newport: {
    id: "cal_newport",
    label: "Cal Newport",
    category: "practical",
    themes: "deep work, concentration, meaningful effort, reducing distraction",
  },
  annie_duke: {
    id: "annie_duke",
    label: "Annie Duke",
    category: "decision_making",
    themes:
      "decision quality, uncertainty, probabilities, thinking in bets",
  },
  shane_parrish: {
    id: "shane_parrish",
    label: "Shane Parrish",
    category: "decision_making",
    themes: "mental models, clear thinking, long-term reasoning",
  },
  esther_perel: {
    id: "esther_perel",
    label: "Esther Perel",
    category: "relationships",
    themes: "relationships, connection, boundaries, communication",
  },
};

export const reflectionInfluenceIdsSchema = z.array(
  z.enum(REFLECTION_INFLUENCE_IDS),
);

export const reflectionInfluencePreferencesSchema = z.object({
  primary: reflectionInfluenceIdsSchema.max(MAX_PRIMARY_INFLUENCES),
  secondary: reflectionInfluenceIdsSchema,
});

export type ReflectionInfluencePreferences = z.infer<
  typeof reflectionInfluencePreferencesSchema
>;

export function isReflectionInfluenceId(
  value: string,
): value is ReflectionInfluenceId {
  return (REFLECTION_INFLUENCE_IDS as readonly string[]).includes(value);
}

function uniqueInfluenceIds(
  values: ReflectionInfluenceId[],
): ReflectionInfluenceId[] {
  return [...new Set(values)];
}

export function normalizeReflectionInfluenceIds(
  values: unknown,
): ReflectionInfluenceId[] {
  const parsed = reflectionInfluenceIdsSchema.safeParse(values);
  if (!parsed.success) {
    return [];
  }

  return uniqueInfluenceIds(parsed.data);
}

export function normalizeReflectionInfluencePreferences(
  value: unknown,
): ReflectionInfluencePreferences {
  if (Array.isArray(value)) {
    const legacy = normalizeReflectionInfluenceIds(value);
    return { primary: [], secondary: legacy };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parsed = reflectionInfluencePreferencesSchema.safeParse({
      primary: record.primary ?? [],
      secondary: record.secondary ?? [],
    });

    if (parsed.success) {
      const primary = uniqueInfluenceIds(parsed.data.primary).slice(
        0,
        MAX_PRIMARY_INFLUENCES,
      );
      const primarySet = new Set(primary);
      const secondary = uniqueInfluenceIds(parsed.data.secondary).filter(
        (id) => !primarySet.has(id),
      );

      return { primary, secondary };
    }
  }

  return { primary: [], secondary: [] };
}

export function getAllSelectedInfluenceIds(
  preferences: ReflectionInfluencePreferences,
): ReflectionInfluenceId[] {
  return uniqueInfluenceIds([
    ...preferences.primary,
    ...preferences.secondary,
  ]);
}

export function formatReflectionInfluenceLabels(
  preferences: ReflectionInfluencePreferences | ReflectionInfluenceId[],
): string {
  const ids = Array.isArray(preferences)
    ? preferences
    : getAllSelectedInfluenceIds(preferences);

  return ids.map((id) => REFLECTION_INFLUENCES[id].label).join(" · ");
}

export function getInfluencesByCategory(): Array<{
  category: (typeof REFLECTION_INFLUENCE_CATEGORIES)[number];
  influences: ReflectionInfluence[];
}> {
  return REFLECTION_INFLUENCE_CATEGORIES.map((category) => ({
    category,
    influences: REFLECTION_INFLUENCE_IDS.filter(
      (id) => REFLECTION_INFLUENCES[id].category === category.id,
    ).map((id) => REFLECTION_INFLUENCES[id]),
  }));
}

export function buildReflectionInfluencePromptSection(
  preferences: ReflectionInfluencePreferences,
): string {
  const { primary, secondary } = preferences;
  const all = getAllSelectedInfluenceIds(preferences);

  if (all.length === 0) {
    return "";
  }

  const formatLine = (id: ReflectionInfluenceId) => {
    const influence = REFLECTION_INFLUENCES[id];
    return `- ${influence.label}: ${influence.themes}`;
  };

  const sections: string[] = [
    "The user has selected reflection influences as thematic lenses.",
    "Use ideas commonly associated with these influences.",
    "Do not impersonate authors, mimic their writing style, invent quotations, or claim an author would say something.",
    "Do not provide medical or therapeutic diagnosis.",
    "Offer gentle reflective questions, not commands.",
  ];

  if (primary.length > 0) {
    sections.push(
      "",
      "Primary influences (emphasize these most):",
      ...primary.map(formatLine),
    );
  }

  if (secondary.length > 0) {
    sections.push(
      "",
      "Secondary influences (weave in lightly):",
      ...secondary.map(formatLine),
    );
  }

  const lensNotes = all
    .map((id) => REFLECTION_INFLUENCES[id].promptNotes)
    .filter((note): note is string => Boolean(note));

  if (lensNotes.length > 0) {
    sections.push("", ...lensNotes);
  }

  return sections.join("\n");
}
