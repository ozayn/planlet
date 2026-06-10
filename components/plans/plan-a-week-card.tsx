"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatDateString,
  formatWeekStartString,
  parseDateString,
} from "@/lib/dates";

export function PlanAWeekCard() {
  const router = useRouter();
  const [date, setDate] = useState(formatDateString(new Date()));

  function handleOpen() {
    if (!date) return;
    router.push(`/plans/week/${formatWeekStartString(parseDateString(date))}`);
  }

  return (
    <section className="ui-card-padded space-y-2.5">
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-foreground">Plan a week</h3>
        <p className="text-xs text-muted">
          Open or create a weekly plan for any week.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="plan-a-week"
          name="planAWeek"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="ui-input ui-input-compact min-h-9 flex-1"
          aria-label="Week containing date"
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
