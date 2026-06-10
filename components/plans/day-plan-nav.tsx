"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
          className="ui-plan-date-nav-btn"
        >
          Previous day
        </Link>

        {showTodayLink ? (
          <Link
            href="/today"
            className={`ui-plan-date-nav-btn${
              currentDate === today ? " ui-plan-date-nav-btn-active" : ""
            }`}
            aria-current={currentDate === today ? "page" : undefined}
          >
            Today
          </Link>
        ) : null}

        <Link
          href={`/plans/day/${shiftDateString(currentDate, 1)}`}
          className="ui-plan-date-nav-btn"
        >
          Next day
        </Link>
      </div>

      <label htmlFor="day-plan-nav-date" className="ui-plan-date-nav-date">
        <span className="ui-plan-date-nav-date-label">Date</span>
        <input
          id="day-plan-nav-date"
          name="dayPlanNavDate"
          type="date"
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
