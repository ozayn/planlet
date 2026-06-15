import type { ObservationCategory } from "@/app/generated/prisma/client";

const CATEGORY_LABELS: Record<ObservationCategory, string> = {
  MIND: "Mind",
  EMOTION: "Emotion",
  BODY: "Body",
  SLEEP: "Sleep",
  ENERGY: "Energy",
  CYCLE: "Cycle",
  PAIN: "Pain",
  SKIN: "Skin",
  SUBSTANCES: "Substances",
  OTHER: "Other",
};

export function getObservationCategoryLabel(
  category: ObservationCategory,
): string {
  return CATEGORY_LABELS[category];
}
