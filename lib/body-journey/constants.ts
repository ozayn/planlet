import type { BodyJourneyPeriodValue } from "@/lib/body-journey-period";
import type {
  BodySideValue,
  BodySymptomTypeValue,
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
