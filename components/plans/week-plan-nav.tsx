"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  formatWeekStartString,
  parseDateString,
  shiftWeekString,
} from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type WeekPlanNavProps = {
  currentWeekStart: string;
};

export function WeekPlanNav({ currentWeekStart }: WeekPlanNavProps) {
  const router = useRouter();
  const thisWeekStart = formatWeekStartString(new Date());
  const [pickerValue, setPickerValue] = useState(currentWeekStart);

  useEffect(() => {
    setPickerValue(currentWeekStart);
  }, [currentWeekStart]);

  function openWeek(dateString: string) {
    router.push(`/plans/week/${formatWeekStartString(parseDateString(dateString))}`);
  }

  return (
    <nav className="ui-plan-date-nav" aria-label="Week plan navigation">
      <div className="ui-plan-date-nav-controls">
        <Link
          href={`/plans/week/${shiftWeekString(currentWeekStart, -1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label="Previous week"
          title="Previous week"
          {...passwordManagerSafeControlProps}
        >
          <ChevronLeftIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Previous week</span>
        </Link>

        <Link
          href={`/plans/week/${thisWeekStart}`}
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-today${
            currentWeekStart === thisWeekStart ? " ui-plan-date-nav-btn-active" : ""
          }`}
          aria-current={currentWeekStart === thisWeekStart ? "page" : undefined}
          {...passwordManagerSafeControlProps}
        >
          This week
        </Link>

        <Link
          href={`/plans/week/${shiftWeekString(currentWeekStart, 1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label="Next week"
          title="Next week"
          {...passwordManagerSafeControlProps}
        >
          <ChevronRightIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Next week</span>
        </Link>
      </div>

      <label htmlFor="week-plan-nav-date" className="ui-plan-date-nav-date">
        <CalendarIcon className="ui-plan-date-nav-date-icon" aria-hidden="true" />
        <span className="ui-plan-date-nav-date-label">Week</span>
        <input
          id="week-plan-nav-date"
          name="weekPlanNavDate"
          type="date"
          {...passwordManagerSafeControlProps}
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
    </svg>
  );
}
