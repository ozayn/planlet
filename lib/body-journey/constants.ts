import type { BodyJourneyPeriodValue } from "@/lib/body-journey-period";
import {
  BODY_SKIN_CHANGE_LABELS,
  type BodySideValue,
  type BodySkinChangeStatusValue,
  type BodySymptomTypeValue,
} from "@/lib/body-journey-types";

export type SerializedBodyEntry = {
  id: string;
  observedAt: string;
  observedAtLabel: string;
  bodySide: BodySideValue;
  markerX: number;
  markerY: number;
  symptomType: BodySymptomTypeValue;
  intensity: number;
  notes: string | null;
  tags: string[];
  skinSize: string | null;
  skinShape: string | null;
  skinColor: string | null;
  skinChanged: BodySkinChangeStatusValue | null;
  createdAt: string;
  updatedAt: string;
};

export type BodyJourneyPatterns = {
  mostCommonSymptom: BodySymptomTypeValue | null;
  averageIntensity: number | null;
  daysTrackedThisMonth: number;
  symptomCounts: Array<{ type: BodySymptomTypeValue; count: number }>;
};

export type BodyJourneyPageData = {
  period: BodyJourneyPeriodValue;
  side: BodySideValue;
  defaultObservedDate: string;
  mapEntries: SerializedBodyEntry[];
  recentEntries: SerializedBodyEntry[];
  patterns: BodyJourneyPatterns;
};

export function parseBodyEntryTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatBodyEntryTags(tags: string[]): string {
  return tags.join(", ");
}

export function formatBodySkinDetails(entry: {
  skinSize: string | null;
  skinShape: string | null;
  skinColor: string | null;
  skinChanged: BodySkinChangeStatusValue | null;
}): string | null {
  const parts: string[] = [];

  if (entry.skinSize?.trim()) {
    parts.push(`Size: ${entry.skinSize.trim()}`);
  }

  if (entry.skinShape?.trim()) {
    parts.push(`Shape: ${entry.skinShape.trim()}`);
  }

  if (entry.skinColor?.trim()) {
    parts.push(`Color: ${entry.skinColor.trim()}`);
  }

  if (entry.skinChanged) {
    parts.push(`Changed: ${BODY_SKIN_CHANGE_LABELS[entry.skinChanged]}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
