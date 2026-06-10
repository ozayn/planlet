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
  formatWeekStartString,
  parseDateString,
  shiftWeekString,
} from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/action-labels";
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
          aria-label={ACTION_LABELS.previousWeek.ariaLabel}
          title={ACTION_LABELS.previousWeek.title}
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
          aria-label={ACTION_LABELS.nextWeek.ariaLabel}
          title={ACTION_LABELS.nextWeek.title}
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
          aria-label={ACTION_LABELS.chooseWeek.ariaLabel}
        />
      </label>
    </nav>
  );
}
