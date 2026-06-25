import type { BodySide, BodySymptomType } from "@/app/generated/prisma/client";

export type BodyJourneyPeriod = "today" | "week" | "month";

export type SerializedBodyEntry = {
  id: string;
  entryDate: string;
  entryDateLabel: string;
  bodySide: BodySide;
  markerX: number;
  markerY: number;
  symptomType: BodySymptomType;
  intensity: number;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type BodySymptomMeta = {
  label: string;
  color: string;
};

export const BODY_SYMPTOM_META: Record<BodySymptomType, BodySymptomMeta> = {
  PAIN: { label: "Pain", color: "#d4a5a5" },
  TENSION: { label: "Tension", color: "#d4c4a5" },
  NUMBNESS: { label: "Numbness", color: "#a5b8d4" },
  TINGLING: { label: "Tingling", color: "#a5c4d4" },
  BURNING: { label: "Burning", color: "#d4b8a5" },
  FATIGUE: { label: "Fatigue", color: "#c4b5d4" },
  OTHER: { label: "Other", color: "#c8c4bf" },
};

export const BODY_SYMPTOM_TYPES = Object.keys(
  BODY_SYMPTOM_META,
) as BodySymptomType[];

export type BodyJourneyPatterns = {
  mostCommonSymptom: BodySymptomType | null;
  averageIntensity: number | null;
  daysTrackedThisMonth: number;
  symptomCounts: Array<{ type: BodySymptomType; count: number }>;
};

export type BodyJourneyPageData = {
  period: BodyJourneyPeriod;
  side: BodySide;
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
