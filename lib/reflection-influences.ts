import { z } from "zod";

export const REFLECTION_INFLUENCE_IDS = [
  "alan_watts",
  "gabor_mate",
  "eckhart_tolle",
  "ram_dass",
  "tara_brach",
  "viktor_frankl",
  "stoicism",
  "buddhism",
  "vipassana",
] as const;

export type ReflectionInfluenceId = (typeof REFLECTION_INFLUENCE_IDS)[number];

export type ReflectionInfluence = {
  id: ReflectionInfluenceId;
  label: string;
  themes: string;
};

export const REFLECTION_INFLUENCES: Record<
  ReflectionInfluenceId,
  ReflectionInfluence
> = {
  alan_watts: {
    id: "alan_watts",
    label: "Alan Watts",
    themes: "acceptance, playfulness, non-attachment to control",
  },
  gabor_mate: {
    id: "gabor_mate",
    label: "Gabor Maté",
    themes:
      "compassion, trauma-aware curiosity, unmet needs, mind-body stress",
  },
  eckhart_tolle: {
    id: "eckhart_tolle",
    label: "Eckhart Tolle",
    themes: "presence, observing thoughts, disidentification from mental stories",
  },
  ram_dass: {
    id: "ram_dass",
    label: "Ram Dass",
    themes: "loving awareness, being with what is, gentle perspective",
  },
  tara_brach: {
    id: "tara_brach",
    label: "Tara Brach",
    themes: "radical acceptance, RAIN, kindness toward difficulty",
  },
  viktor_frankl: {
    id: "viktor_frankl",
    label: "Viktor Frankl",
    themes: "meaning, choice of attitude, values under constraint",
  },
  stoicism: {
    id: "stoicism",
    label: "Stoicism",
    themes: "what is in your control, virtue, equanimity, practical reason",
  },
  buddhism: {
    id: "buddhism",
    label: "Buddhism",
    themes: "impermanence, compassion, reducing clinging, mindful attention",
  },
  vipassana: {
    id: "vipassana",
    label: "Vipassana",
    themes: "bare attention, noticing sensations and change, patient observation",
  },
};

export const reflectionInfluenceIdsSchema = z.array(
  z.enum(REFLECTION_INFLUENCE_IDS),
);

export function isReflectionInfluenceId(
  value: string,
): value is ReflectionInfluenceId {
  return (REFLECTION_INFLUENCE_IDS as readonly string[]).includes(value);
}

export function normalizeReflectionInfluenceIds(
  values: unknown,
): ReflectionInfluenceId[] {
  const parsed = reflectionInfluenceIdsSchema.safeParse(values);
  if (!parsed.success) {
    return [];
  }

  return [...new Set(parsed.data)];
}

export function formatReflectionInfluenceLabels(
  ids: ReflectionInfluenceId[],
): string {
  return ids
    .map((id) => REFLECTION_INFLUENCES[id].label)
    .join(" · ");
}

export function buildReflectionInfluencePromptSection(
  ids: ReflectionInfluenceId[],
): string {
  if (ids.length === 0) {
    return "";
  }

  const lines = ids.map((id) => {
    const influence = REFLECTION_INFLUENCES[id];
    return `- ${influence.label}: ${influence.themes}`;
  });

  return `The user has selected these reflection influences:
${lines.join("\n")}

Use these as thematic lenses.
Do not imitate their exact voice.
Do not fabricate quotes.
Do not claim they would say something.
Do not provide medical or therapeutic diagnosis.
Offer gentle reflective questions, not commands.`;
}
