import { buildReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import type { ReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import type { ReadAloudSection } from "@/lib/life-lab/read-aloud-sections";
import { plainTextToSpeechText } from "@/lib/life-lab/speech";

export const COACHING_READ_ALOUD_SECTION_IDS = {
  REFLECTION: "reflection",
  QUESTION: "question-for-you",
  EXPERIMENT: "small-experiment",
} as const;

export type CoachingReadAloudContent = {
  reflection: string;
  question: string | null;
  experiment: string | null;
};

export type CoachingReadAloudSectionDefinition = {
  id: string;
  title: string;
  sourceText: string | null;
};

const COACHING_SECTION_DEFINITIONS: CoachingReadAloudSectionDefinition[] = [
  {
    id: COACHING_READ_ALOUD_SECTION_IDS.REFLECTION,
    title: "Reflection",
    sourceText: null,
  },
  {
    id: COACHING_READ_ALOUD_SECTION_IDS.QUESTION,
    title: "Question for you",
    sourceText: null,
  },
  {
    id: COACHING_READ_ALOUD_SECTION_IDS.EXPERIMENT,
    title: "Small experiment",
    sourceText: null,
  },
];

function cleanCoachingSectionText(text: string | null | undefined): string {
  if (!text) {
    return "";
  }

  return plainTextToSpeechText(text.trim());
}

export function buildCoachingReadAloudSections(
  content: CoachingReadAloudContent,
): ReadAloudSection[] {
  const sourceById: Record<string, string | null> = {
    [COACHING_READ_ALOUD_SECTION_IDS.REFLECTION]: content.reflection,
    [COACHING_READ_ALOUD_SECTION_IDS.QUESTION]: content.question,
    [COACHING_READ_ALOUD_SECTION_IDS.EXPERIMENT]: content.experiment,
  };

  let documentOrder = 0;

  return COACHING_SECTION_DEFINITIONS.flatMap((definition) => {
    const text = cleanCoachingSectionText(sourceById[definition.id]);

    if (!text) {
      return [];
    }

    documentOrder += 1;

    return [
      {
        id: definition.id,
        title: definition.title,
        text,
        order: documentOrder,
        documentOrder,
        category: "OTHER" as const,
      },
    ];
  });
}

export function buildCoachingReadAloudPlaybackPlan(
  content: CoachingReadAloudContent,
): ReadAloudPlaybackPlan {
  return buildReadAloudPlaybackPlan(buildCoachingReadAloudSections(content));
}
