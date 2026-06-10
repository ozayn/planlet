import type { PlanItemView } from "@/app/generated/prisma/client";

export const PLAN_ITEM_VIEW_OPTIONS: Array<{
  value: PlanItemView;
  label: string;
  helper: string;
}> = [
  {
    value: "MINIMAL",
    label: "Minimal",
    helper: "Quiet rows with subtle status.",
  },
  {
    value: "CHECKLIST",
    label: "Checklist",
    helper: "More visible checkmarks for tasks.",
  },
];
