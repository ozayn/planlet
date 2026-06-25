export const BODY_SIDES = ["FRONT", "BACK"] as const;

export type BodySideValue = (typeof BODY_SIDES)[number];

export const BODY_SIDE_LABELS: Record<BodySideValue, string> = {
  FRONT: "Front",
  BACK: "Back",
};

export function isBodySide(value: string): value is BodySideValue {
  return (BODY_SIDES as readonly string[]).includes(value);
}

export function parseBodySide(value: string | undefined): BodySideValue {
  const normalized = value?.trim().toUpperCase();
  if (normalized && isBodySide(normalized)) {
    return normalized;
  }

  return "FRONT";
}

export const BODY_SYMPTOM_TYPES = [
  "PAIN",
  "TENSION",
  "NUMBNESS",
  "TINGLING",
  "BURNING",
  "FATIGUE",
  "OTHER",
] as const;

export type BodySymptomTypeValue = (typeof BODY_SYMPTOM_TYPES)[number];

export type BodySymptomMeta = {
  label: string;
  color: string;
};

export const BODY_SYMPTOM_META: Record<BodySymptomTypeValue, BodySymptomMeta> = {
  PAIN: { label: "Pain", color: "#d4a5a5" },
  TENSION: { label: "Tension", color: "#d4c4a5" },
  NUMBNESS: { label: "Numbness", color: "#a5b8d4" },
  TINGLING: { label: "Tingling", color: "#a5c4d4" },
  BURNING: { label: "Burning", color: "#d4b8a5" },
  FATIGUE: { label: "Fatigue", color: "#c4b5d4" },
  OTHER: { label: "Other", color: "#c8c4bf" },
};

export function isBodySymptomType(
  value: string,
): value is BodySymptomTypeValue {
  return (BODY_SYMPTOM_TYPES as readonly string[]).includes(value);
}

export function getBodySymptomLabel(type: BodySymptomTypeValue): string {
  return BODY_SYMPTOM_META[type].label;
}
