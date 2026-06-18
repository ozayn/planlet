"use client";

import { useTransition } from "react";

import { createYearPlanForDateAction } from "@/app/(app)/plans/actions";

type CreateYearPlanButtonProps = {
  dateString: string;
};

export function CreateYearPlanButton({ dateString }: CreateYearPlanButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createYearPlanForDateAction(dateString);
        });
      }}
      className="ui-btn-primary"
    >
      {isPending ? "Creating…" : "Create yearly plan"}
    </button>
  );
}
