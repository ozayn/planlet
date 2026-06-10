"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  formatDateString,
  shiftDateString,
} from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

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

  useEffect(() => {
    setPickerValue(currentDate);
  }, [currentDate]);

  function openDate(dateString: string) {
    if (dateString === today && showTodayLink) {
      router.push("/today");
      return;
    }

    router.push(`/plans/day/${dateString}`);
  }

  return (
    <nav className="ui-plan-date-nav" aria-label="Day plan navigation">
      <div className="ui-plan-date-nav-controls">
        <Link
          href={`/plans/day/${shiftDateString(currentDate, -1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label="Previous day"
          title="Previous day"
          {...passwordManagerSafeControlProps}
        >
          <ChevronLeftIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Previous day</span>
        </Link>

        {showTodayLink ? (
          <Link
            href="/today"
            className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-today${
              currentDate === today ? " ui-plan-date-nav-btn-active" : ""
            }`}
            aria-current={currentDate === today ? "page" : undefined}
            {...passwordManagerSafeControlProps}
          >
            Today
          </Link>
        ) : null}

        <Link
          href={`/plans/day/${shiftDateString(currentDate, 1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label="Next day"
          title="Next day"
          {...passwordManagerSafeControlProps}
        >
          <ChevronRightIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Next day</span>
        </Link>
      </div>

      <label htmlFor="day-plan-nav-date" className="ui-plan-date-nav-date">
        <CalendarIcon className="ui-plan-date-nav-date-icon" aria-hidden="true" />
        <span className="ui-plan-date-nav-date-label">Date</span>
        <input
          id="day-plan-nav-date"
          name="dayPlanNavDate"
          type="date"
          {...passwordManagerSafeControlProps}
          value={pickerValue}
          onChange={(event) => {
            const value = event.target.value;
            setPickerValue(value);
            if (value) {
              openDate(value);
            }
          }}
          className="ui-plan-date-nav-date-input"
          aria-label="Choose plan date"
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
