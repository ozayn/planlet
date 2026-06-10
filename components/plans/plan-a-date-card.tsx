"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDateString } from "@/lib/dates";

export function PlanADateCard() {
  const router = useRouter();
  const [date, setDate] = useState(formatDateString(new Date()));

  function handleOpen() {
    if (!date) return;
    router.push(`/plans/day/${date}`);
  }

  return (
    <section className="ui-card-padded space-y-2.5">
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground">Plan a date</h3>
        <p className="text-xs text-muted">
          Open or create a daily plan for any date.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="plan-a-date"
          name="planADate"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="ui-input ui-input-compact min-h-9 flex-1"
          aria-label="Plan date"
        />
        <button
          type="button"
          onClick={handleOpen}
          disabled={!date}
          className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-4"
        >
          Open
        </button>
      </div>
    </section>
  );
}
