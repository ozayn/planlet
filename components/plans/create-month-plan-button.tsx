"use client";

import { useTransition } from "react";

import { createMonthPlanForDateAction } from "@/app/(app)/plans/actions";

type CreateMonthPlanButtonProps = {
  dateString: string;
};

export function CreateMonthPlanButton({ dateString }: CreateMonthPlanButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createMonthPlanForDateAction(dateString);
        });
      }}
      className="ui-btn-primary"
    >
      {isPending ? "Creating…" : "Create monthly plan"}
    </button>
  );
}
