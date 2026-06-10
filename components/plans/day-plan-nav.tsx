"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/action-icons";
import {
  formatDateString,
  shiftDateString,
} from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/action-labels";
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
          aria-label={ACTION_LABELS.previousDay.ariaLabel}
          title={ACTION_LABELS.previousDay.title}
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
          aria-label={ACTION_LABELS.nextDay.ariaLabel}
          title={ACTION_LABELS.nextDay.title}
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
          aria-label={ACTION_LABELS.chooseDate.ariaLabel}
        />
      </label>
    </nav>
  );
}
