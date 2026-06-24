import type { CareerPracticeMode, CareerPracticeType } from "@/app/generated/prisma/client";

import type { CareerCapacity, EmotionalSafety } from "@/lib/career-journey/capacity";
import { defaultModeForCapacity } from "@/lib/career-journey/capacity";

export type CareerSuggestion = {
  id: string;
  title: string;
  type: CareerPracticeType;
  pillarName: string;
  /** Preferred mode when capacity is medium/high */
  baseMode: CareerPracticeMode;
  /** Shown only when capacity matches */
  capacities: CareerCapacity[];
};

export type CareerSuggestionGroup = {
  id: string;
  label: string;
  pillarName: string;
  suggestions: CareerSuggestion[];
};

const ALL_CAPACITIES: CareerCapacity[] = ["LOW", "MEDIUM", "HIGH"];

export const TECHNICAL_PREP_GROUPS: CareerSuggestionGroup[] = [
  {
    id: "leetcode",
    label: "LeetCode",
    pillarName: "Technical prep",
    suggestions: [
      {
        id: "lc-read-solution",
        title: "Read one solution",
        type: "LEETCODE",
        pillarName: "Technical prep",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "lc-easy",
        title: "Solve one easy problem",
        type: "LEETCODE",
        pillarName: "Technical prep",
        baseMode: "WARMUP",
        capacities: ["MEDIUM", "HIGH"],
      },
      {
        id: "lc-pattern",
        title: "Review one pattern",
        type: "LEETCODE",
        pillarName: "Technical prep",
        baseMode: "WARMUP",
        capacities: ALL_CAPACITIES,
      },
    ],
  },
  {
    id: "interview-questions",
    label: "Interview questions",
    pillarName: "Technical prep",
    suggestions: [
      {
        id: "iq-behavioral",
        title: "Practice one behavioral answer",
        type: "INTERVIEW_PREP",
        pillarName: "Technical prep",
        baseMode: "WARMUP",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "iq-hard-gentle",
        title: "Review one hard question gently",
        type: "INTERVIEW_PREP",
        pillarName: "Technical prep",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "iq-write-no-judge",
        title: "Write one answer without judging it",
        type: "INTERVIEW_PREP",
        pillarName: "Technical prep",
        baseMode: "WARMUP",
        capacities: ["MEDIUM", "HIGH"],
      },
    ],
  },
  {
    id: "ml-ds",
    label: "ML/DS review",
    pillarName: "Technical prep",
    suggestions: [
      {
        id: "ml-concept",
        title: "Review one concept",
        type: "ML_REVIEW",
        pillarName: "Technical prep",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "ml-flashcards",
        title: "Make 3 flashcards",
        type: "ML_REVIEW",
        pillarName: "Technical prep",
        baseMode: "WARMUP",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "ml-watch",
        title: "Watch 10 minutes of a course",
        type: "COURSE",
        pillarName: "Learning",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
    ],
  },
];

export const TRACK_SUGGESTION_GROUPS: CareerSuggestionGroup[] = [
  {
    id: "applications",
    label: "Applications",
    pillarName: "Applications",
    suggestions: [
      {
        id: "app-one",
        title: "Send one application — enough for today",
        type: "APPLICATION",
        pillarName: "Applications",
        baseMode: "WARMUP",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "app-tailor",
        title: "Tailor one resume bullet",
        type: "APPLICATION",
        pillarName: "Applications",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
    ],
  },
  {
    id: "networking",
    label: "Networking",
    pillarName: "Networking",
    suggestions: [
      {
        id: "net-message",
        title: "Send one warm message",
        type: "NETWORKING",
        pillarName: "Networking",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "net-coffee",
        title: "Schedule or note one coffee chat",
        type: "NETWORKING",
        pillarName: "Networking",
        baseMode: "WARMUP",
        capacities: ["MEDIUM", "HIGH"],
      },
    ],
  },
  ...TECHNICAL_PREP_GROUPS,
  {
    id: "portfolio",
    label: "Portfolio / projects",
    pillarName: "Portfolio/projects",
    suggestions: [
      {
        id: "proj-tiny",
        title: "One tiny project step",
        type: "PROJECT",
        pillarName: "Portfolio/projects",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "proj-doc",
        title: "Document one project win",
        type: "PROJECT",
        pillarName: "Portfolio/projects",
        baseMode: "WARMUP",
        capacities: ["MEDIUM", "HIGH"],
      },
    ],
  },
  {
    id: "recovery",
    label: "Recovery / reflection",
    pillarName: "Recovery/reflection",
    suggestions: [
      {
        id: "rec-walk",
        title: "Take a gentle walk — protect energy",
        type: "RECOVERY",
        pillarName: "Recovery / reflection",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
      {
        id: "rec-journal",
        title: "Write three lines — no grading",
        type: "RECOVERY",
        pillarName: "Recovery / reflection",
        baseMode: "TINY",
        capacities: ALL_CAPACITIES,
      },
    ],
  },
];

export function resolveSuggestionMode(
  suggestion: CareerSuggestion,
  capacity: CareerCapacity,
  safety: EmotionalSafety | null,
): CareerPracticeMode {
  const defaultMode = defaultModeForCapacity(capacity, safety);

  if (capacity === "LOW" || safety === "TINY" || safety === "RECOVERY") {
    return "TINY";
  }

  if (defaultMode === "TINY" || defaultMode === "WARMUP") {
    return suggestion.baseMode === "MODERATE" || suggestion.baseMode === "DEEP"
      ? defaultMode
      : suggestion.baseMode;
  }

  return suggestion.baseMode;
}

export function filterSuggestionsForCapacity(
  groups: CareerSuggestionGroup[],
  capacity: CareerCapacity,
  safety: EmotionalSafety | null,
): CareerSuggestionGroup[] {
  const effectiveCapacity =
    safety === "TINY" || safety === "RECOVERY" ? "LOW" : capacity;

  return groups
    .map((group) => ({
      ...group,
      suggestions: group.suggestions.filter((s) =>
        s.capacities.includes(effectiveCapacity),
      ),
    }))
    .filter((group) => group.suggestions.length > 0);
}

export function findSuggestionById(id: string): CareerSuggestion | null {
  for (const group of TRACK_SUGGESTION_GROUPS) {
    const match = group.suggestions.find((s) => s.id === id);
    if (match) return match;
  }
  return null;
}
