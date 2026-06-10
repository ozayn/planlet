import type { ObservationCategory } from "@/app/generated/prisma/client";

const CATEGORY_LABELS: Record<ObservationCategory, string> = {
  MIND: "Mind",
  EMOTION: "Emotion",
  BODY: "Body",
  CYCLE: "Cycle",
  PAIN: "Pain",
  SKIN: "Skin",
  SLEEP: "Sleep",
  ENERGY: "Energy",
  OTHER: "Other",
};

export function getObservationCategoryLabel(
  category: ObservationCategory,
): string {
  return CATEGORY_LABELS[category];
}
