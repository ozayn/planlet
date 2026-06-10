import type { PlanItemView } from "@/app/generated/prisma/client";

/**
 * CHECKLIST is stored in the database but shown as "Expressive" in the UI
 * because it uses prominent emoji/checkmark status styling.
 */
export const PLAN_ITEM_VIEW_OPTIONS: Array<{
  value: PlanItemView;
  label: string;
  helper: string;
}> = [
  {
    value: "MINIMAL",
    label: "Minimal",
    helper: "Quiet icons and subtle status pills.",
  },
  {
    value: "CHECKLIST",
    label: "Expressive",
    helper: "Larger visual status icons like ✅ and ☐.",
  },
];

export function isExpressiveItemView(itemView: PlanItemView): boolean {
  return itemView === "CHECKLIST";
}
