"use client";

import { useTransition } from "react";

import { createDayPlanForDateAction } from "@/app/(app)/plans/actions";

type CreateDayPlanButtonProps = {
  dateString: string;
};

export function CreateDayPlanButton({ dateString }: CreateDayPlanButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createDayPlanForDateAction(dateString);
        });
      }}
      className="ui-btn-primary"
    >
      {isPending ? "Creating…" : "Create plan for this date"}
    </button>
  );
}
