"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatDateString,
  shiftDateString,
} from "@/lib/dates";

type DayPlanNavProps = {
  currentDate: string;
  showTodayLink?: boolean;
};

export function DayPlanNav({
  currentDate,
  showTodayLink = true,
}: DayPlanNavProps) {
  const router = useRouter();
  const today = formatDateString(new Date());
  const [pickerValue, setPickerValue] = useState(currentDate);

  function openDate(dateString: string) {
    if (dateString === today && showTodayLink) {
      router.push("/today");
      return;
    }

    router.push(`/plans/day/${dateString}`);
  }

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="Day plan navigation"
    >
      <Link
        href={`/plans/day/${shiftDateString(currentDate, -1)}`}
        className="ui-btn-secondary ui-btn-compact min-h-9 px-3"
      >
        Previous day
      </Link>

      {showTodayLink ? (
        <Link
          href="/today"
          className={`ui-btn-compact min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
            currentDate === today
              ? "ui-segment-active"
              : "ui-segment"
          }`}
        >
          Today
        </Link>
      ) : null}

      <Link
        href={`/plans/day/${shiftDateString(currentDate, 1)}`}
        className="ui-btn-secondary ui-btn-compact min-h-9 px-3"
      >
        Next day
      </Link>

      <label className="flex min-h-9 items-center gap-2 rounded-lg border border-border-soft bg-surface px-2.5 text-sm">
        <span className="text-muted-light">Date</span>
        <input
          type="date"
          value={pickerValue}
          onChange={(event) => {
            const value = event.target.value;
            setPickerValue(value);
            if (value) {
              openDate(value);
            }
          }}
          className="bg-transparent text-foreground outline-none"
          aria-label="Choose plan date"
        />
      </label>
    </nav>
  );
}
