import type { PriorityLevel } from "@/app/generated/prisma/client";

export type PriorityQuadrantKey =
  | "doSoon"
  | "protectTime"
  | "contain"
  | "maybeRelease";

export type PriorityQuadrantChoice = {
  key: PriorityQuadrantKey;
  importance: PriorityLevel;
  urgency: PriorityLevel;
  label: string;
  shortLabel: string;
  description: string;
};

export const PRIORITY_QUADRANT_CHOICES: PriorityQuadrantChoice[] = [
  {
    key: "doSoon",
    importance: "HIGH",
    urgency: "HIGH",
    label: "Do soon",
    shortLabel: "Soon",
    description: "Important and urgent",
  },
  {
    key: "protectTime",
    importance: "HIGH",
    urgency: "LOW",
    label: "Protect time",
    shortLabel: "Protect",
    description: "Important, not urgent",
  },
  {
    key: "contain",
    importance: "LOW",
    urgency: "HIGH",
    label: "Contain",
    shortLabel: "Contain",
    description: "Urgent, less important",
  },
  {
    key: "maybeRelease",
    importance: "LOW",
    urgency: "LOW",
    label: "Maybe release",
    shortLabel: "Release",
    description: "Less important, less urgent",
  },
];

const CHOICE_BY_KEY = Object.fromEntries(
  PRIORITY_QUADRANT_CHOICES.map((choice) => [choice.key, choice]),
) as Record<PriorityQuadrantKey, PriorityQuadrantChoice>;

function isHigh(level: PriorityLevel | null | undefined): boolean {
  return level === "HIGH";
}

function isLowOrMedium(level: PriorityLevel | null | undefined): boolean {
  return level === "LOW" || level === "MEDIUM";
}

/**
 * Eisenhower-style buckets for insights (not scoring).
 */
export function classifyPriorityQuadrant(item: {
  importance: PriorityLevel | null;
  urgency: PriorityLevel | null;
}): PriorityQuadrantKey | "unclassified" {
  const { importance, urgency } = item;

  if (isHigh(importance) && isHigh(urgency)) {
    return "doSoon";
  }

  if (isHigh(importance)) {
    return "protectTime";
  }

  if (isHigh(urgency)) {
    return "contain";
  }

  if (isLowOrMedium(importance) || isLowOrMedium(urgency)) {
    return "maybeRelease";
  }

  return "unclassified";
}

export function isPriorityUnset(
  importance: PriorityLevel | null,
  urgency: PriorityLevel | null,
): boolean {
  return importance === null && urgency === null;
}

/** Best label for row display; null when unset. */
export function getPriorityRowLabel(
  importance: PriorityLevel | null,
  urgency: PriorityLevel | null,
  options?: { short?: boolean },
): string | null {
  if (isPriorityUnset(importance, urgency)) {
    return null;
  }

  const exact = PRIORITY_QUADRANT_CHOICES.find(
    (choice) =>
      choice.importance === importance && choice.urgency === urgency,
  );

  if (exact) {
    return options?.short ? exact.shortLabel : exact.label;
  }

  const quadrant = classifyPriorityQuadrant({ importance, urgency });
  if (quadrant === "unclassified") {
    return options?.short ? "Priority" : "Priority";
  }

  const choice = CHOICE_BY_KEY[quadrant];
  return options?.short ? choice.shortLabel : choice.label;
}

export function getPriorityQuadrantChoice(
  key: PriorityQuadrantKey,
): PriorityQuadrantChoice {
  return CHOICE_BY_KEY[key];
}

export function resolveSelectedQuadrantKey(
  importance: PriorityLevel | null,
  urgency: PriorityLevel | null,
): PriorityQuadrantKey | null {
  if (isPriorityUnset(importance, urgency)) {
    return null;
  }

  const exact = PRIORITY_QUADRANT_CHOICES.find(
    (choice) =>
      choice.importance === importance && choice.urgency === urgency,
  );

  if (exact) {
    return exact.key;
  }

  const quadrant = classifyPriorityQuadrant({ importance, urgency });
  return quadrant === "unclassified" ? null : quadrant;
}
