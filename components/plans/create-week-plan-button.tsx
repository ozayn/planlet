"use client";

import { useTransition } from "react";

import { createWeekPlanForDateAction } from "@/app/(app)/plans/actions";

type CreateWeekPlanButtonProps = {
  dateString: string;
};

export function CreateWeekPlanButton({ dateString }: CreateWeekPlanButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createWeekPlanForDateAction(dateString);
        });
      }}
      className="ui-btn-primary"
    >
      {isPending ? "Creating…" : "Create weekly plan"}
    </button>
  );
}
