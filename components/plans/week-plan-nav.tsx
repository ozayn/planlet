"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatWeekStartString,
  parseDateString,
  shiftWeekString,
} from "@/lib/dates";

type WeekPlanNavProps = {
  currentWeekStart: string;
};

export function WeekPlanNav({ currentWeekStart }: WeekPlanNavProps) {
  const router = useRouter();
  const thisWeekStart = formatWeekStartString(new Date());
  const [pickerValue, setPickerValue] = useState(currentWeekStart);

  function openWeek(dateString: string) {
    router.push(`/plans/week/${formatWeekStartString(parseDateString(dateString))}`);
  }

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="Week plan navigation"
    >
      <Link
        href={`/plans/week/${shiftWeekString(currentWeekStart, -1)}`}
        className="ui-btn-secondary ui-btn-compact min-h-9 px-3"
      >
        Previous week
      </Link>

      <Link
        href={`/plans/week/${thisWeekStart}`}
        className={`ui-btn-compact min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
          currentWeekStart === thisWeekStart
            ? "ui-segment-active"
            : "ui-segment"
        }`}
      >
        This week
      </Link>

      <Link
        href={`/plans/week/${shiftWeekString(currentWeekStart, 1)}`}
        className="ui-btn-secondary ui-btn-compact min-h-9 px-3"
      >
        Next week
      </Link>

      <label className="flex min-h-9 items-center gap-2 rounded-lg border border-border-soft bg-surface px-2.5 text-sm">
        <span className="text-muted-light">Week</span>
        <input
          type="date"
          value={pickerValue}
          onChange={(event) => {
            const value = event.target.value;
            setPickerValue(value);
            if (value) {
              openWeek(value);
            }
          }}
          className="bg-transparent text-foreground outline-none"
          aria-label="Choose week"
        />
      </label>
    </nav>
  );
}
