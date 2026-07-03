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

export const BODY_SENSATION_SYMPTOM_TYPES = [
  "PAIN",
  "TENSION",
  "NUMBNESS",
  "TINGLING",
  "BURNING",
  "FATIGUE",
  "OTHER",
] as const;

export const BODY_SKIN_SYMPTOM_TYPES = [
  "SKIN_SPOT",
  "RASH",
  "ITCHING",
  "BRUISE",
  "SWELLING",
  "CUT_WOUND",
  "COLOR_CHANGE",
  "TEXTURE_CHANGE",
] as const;

export const BODY_SYMPTOM_TYPES = [
  ...BODY_SENSATION_SYMPTOM_TYPES,
  ...BODY_SKIN_SYMPTOM_TYPES,
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
  SKIN_SPOT: { label: "Skin spot", color: "#c9a0a0" },
  RASH: { label: "Rash", color: "#d49a9a" },
  ITCHING: { label: "Itching", color: "#d4c49a" },
  BRUISE: { label: "Bruise", color: "#b5a5c4" },
  SWELLING: { label: "Swelling", color: "#d4b59a" },
  CUT_WOUND: { label: "Cut / wound", color: "#c49a9a" },
  COLOR_CHANGE: { label: "Color change", color: "#9ab0c4" },
  TEXTURE_CHANGE: { label: "Texture change", color: "#b8b4b0" },
};

export const BODY_SYMPTOM_GROUPS = [
  {
    label: "Sensation",
    types: BODY_SENSATION_SYMPTOM_TYPES,
  },
  {
    label: "Skin",
    types: BODY_SKIN_SYMPTOM_TYPES,
  },
] as const;

export const BODY_SKIN_CHANGE_STATUSES = ["YES", "NO", "UNKNOWN"] as const;

export type BodySkinChangeStatusValue =
  (typeof BODY_SKIN_CHANGE_STATUSES)[number];

export const BODY_SKIN_CHANGE_LABELS: Record<
  BodySkinChangeStatusValue,
  string
> = {
  YES: "Yes",
  NO: "No",
  UNKNOWN: "Unknown",
};

export function isBodySymptomType(
  value: string,
): value is BodySymptomTypeValue {
  return (BODY_SYMPTOM_TYPES as readonly string[]).includes(value);
}

export function isSkinSymptomType(type: BodySymptomTypeValue): boolean {
  return (BODY_SKIN_SYMPTOM_TYPES as readonly string[]).includes(type);
}

export function isBodySkinChangeStatus(
  value: string,
): value is BodySkinChangeStatusValue {
  return (BODY_SKIN_CHANGE_STATUSES as readonly string[]).includes(value);
}

export function getBodySymptomLabel(type: BodySymptomTypeValue): string {
  return BODY_SYMPTOM_META[type].label;
}
