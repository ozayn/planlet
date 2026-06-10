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
    <section className="ui-card-padded space-y-3">
      <div className="space-y-1">
        <h2 className="ui-section-title">Plan a date</h2>
        <p className="text-sm text-muted">
          Open or create a daily plan for any date.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="ui-input ui-input-compact min-h-10 flex-1"
          aria-label="Plan date"
        />
        <button
          type="button"
          onClick={handleOpen}
          disabled={!date}
          className="ui-btn-secondary ui-btn-compact min-h-10 shrink-0"
        >
          Open date
        </button>
      </div>
    </section>
  );
}
