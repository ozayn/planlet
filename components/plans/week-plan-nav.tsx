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
    <nav className="ui-plan-date-nav" aria-label="Week plan navigation">
      <div className="ui-plan-date-nav-controls">
        <Link
          href={`/plans/week/${shiftWeekString(currentWeekStart, -1)}`}
          className="ui-plan-date-nav-btn"
        >
          Previous week
        </Link>

        <Link
          href={`/plans/week/${thisWeekStart}`}
          className={`ui-plan-date-nav-btn${
            currentWeekStart === thisWeekStart ? " ui-plan-date-nav-btn-active" : ""
          }`}
          aria-current={currentWeekStart === thisWeekStart ? "page" : undefined}
        >
          This week
        </Link>

        <Link
          href={`/plans/week/${shiftWeekString(currentWeekStart, 1)}`}
          className="ui-plan-date-nav-btn"
        >
          Next week
        </Link>
      </div>

      <label className="ui-plan-date-nav-date">
        <span className="ui-plan-date-nav-date-label">Week</span>
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
          className="ui-plan-date-nav-date-input"
          aria-label="Choose week"
        />
      </label>
    </nav>
  );
}
