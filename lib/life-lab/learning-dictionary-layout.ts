"use client";

import type { LifeLabListingDiagnostic } from "@/lib/life-lab/constants";
import type { LifeLabNoteGroup } from "@/lib/life-lab/constants";
import {
  DICTIONARY_CATEGORY_IDS,
  type DictionaryCategoryId,
} from "@/lib/life-lab/learning-dictionary";

/**
 * Stable Learning Dictionary browse order:
 * known categories (Concepts, Phrases, …) → other primary groups → About & reference.
 */
export function orderLearningDictionaryGroups(
  groups: LifeLabNoteGroup[],
): LifeLabNoteGroup[] {
  const primary: LifeLabNoteGroup[] = [];
  const otherPrimary: LifeLabNoteGroup[] = [];
  const about: LifeLabNoteGroup[] = [];

  for (const group of groups) {
    if (
      group.variant === "disclosure" ||
      group.id === "section-files" ||
      group.id === "about" ||
      group.id === "reference"
    ) {
      about.push(group);
      continue;
    }

    const categoryIndex = DICTIONARY_CATEGORY_IDS.indexOf(
      group.id as DictionaryCategoryId,
    );

    if (categoryIndex !== -1) {
      primary.push(group);
    } else {
      otherPrimary.push(group);
    }
  }

  primary.sort((left, right) => {
    const leftIndex = DICTIONARY_CATEGORY_IDS.indexOf(
      left.id as DictionaryCategoryId,
    );
    const rightIndex = DICTIONARY_CATEGORY_IDS.indexOf(
      right.id as DictionaryCategoryId,
    );

    return leftIndex - rightIndex;
  });

  otherPrimary.sort((left, right) => left.label.localeCompare(right.label));

  return [...primary, ...otherPrimary, ...about];
}

export function learningDictionaryLayoutMarker():
  | { "data-learning-dictionary-layout": "compact-v1" }
  | Record<string, never> {
  if (process.env.NODE_ENV === "development") {
    return { "data-learning-dictionary-layout": "compact-v1" };
  }

  return {};
}

export function shouldRenderLearningDictionaryDiagnostics(
  listingDiagnostic: LifeLabListingDiagnostic | null,
  showDiagnostics: boolean,
): boolean {
  return Boolean(showDiagnostics && listingDiagnostic);
}
