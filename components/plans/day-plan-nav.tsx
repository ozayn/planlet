"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/action-icons";
import {
  formatDayNavLabel,
  getRelativeDayNavigationLabel,
  getTodayDateString,
  shiftDateString,
} from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type DayPlanNavProps = {
  currentDate: string;
  /** User's configured Planlet timezone (IANA). */
  timezone: string;
  showTodayLink?: boolean;
};

function useTodayDateString(timezone: string): string {
  const [today, setToday] = useState(() => getTodayDateString(timezone));

  useEffect(() => {
    function refresh() {
      setToday((current) => {
        const next = getTodayDateString(timezone);
        return current === next ? current : next;
      });
    }

    refresh();

    // Refresh near timezone midnight and periodically in case the tab slept.
    const intervalId = window.setInterval(refresh, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timezone]);

  return today;
}

export function DayPlanNav({
  currentDate,
  timezone,
  showTodayLink = true,
}: DayPlanNavProps) {
  const router = useRouter();
  const today = useTodayDateString(timezone);
  const [pickerValue, setPickerValue] = useState(currentDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const previousDate = shiftDateString(currentDate, -1);
  const nextDate = shiftDateString(currentDate, 1);
  const previousLabel =
    getRelativeDayNavigationLabel(previousDate, today) ??
    ACTION_LABELS.previousDay.title;
  const nextLabel =
    getRelativeDayNavigationLabel(nextDate, today) ??
    ACTION_LABELS.nextDay.title;

  useEffect(() => {
    setPickerValue(currentDate);
    setIsDatePickerOpen(false);
  }, [currentDate]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }

    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, [isDatePickerOpen]);

  function openDate(dateString: string) {
    setIsDatePickerOpen(false);

    if (dateString === today && showTodayLink) {
      router.push("/today");
      return;
    }

    router.push(`/plans/day/${dateString}`);
  }

  const centerHref =
    currentDate === today && showTodayLink
      ? "/today"
      : `/plans/day/${currentDate}`;

  return (
    <nav className="ui-plan-date-nav" aria-label="Day plan navigation">
      <div className="ui-plan-date-nav-controls">
        <Link
          href={`/plans/day/${previousDate}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label={previousLabel}
          title={previousLabel}
          {...passwordManagerSafeControlProps}
        >
          <ChevronLeftIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">{previousLabel}</span>
        </Link>

        {showTodayLink ? (
          <Link
            href={centerHref}
            className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-today${
              currentDate === today ? " ui-plan-date-nav-btn-active" : ""
            }`}
            aria-current={currentDate === today ? "page" : undefined}
            {...passwordManagerSafeControlProps}
          >
            {formatDayNavLabel(currentDate, today)}
          </Link>
        ) : null}

        <Link
          href={`/plans/day/${nextDate}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label={nextLabel}
          title={nextLabel}
          {...passwordManagerSafeControlProps}
        >
          <ChevronRightIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">{nextLabel}</span>
        </Link>

        <button
          type="button"
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-icon ui-plan-date-nav-btn-calendar${
            isDatePickerOpen ? " ui-plan-date-nav-btn-active" : ""
          }`}
          aria-label={ACTION_LABELS.chooseDate.ariaLabel}
          title={ACTION_LABELS.chooseDate.title}
          aria-expanded={isDatePickerOpen}
          aria-controls="day-plan-nav-date"
          onClick={() => setIsDatePickerOpen((open) => !open)}
          {...passwordManagerSafeControlProps}
        >
          <CalendarIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">
            {ACTION_LABELS.chooseDate.title}
          </span>
        </button>
      </div>

      <label
        htmlFor="day-plan-nav-date"
        className={`ui-plan-date-nav-date ${
          isDatePickerOpen ? "flex" : "hidden"
        }`}
      >
        <CalendarIcon className="ui-plan-date-nav-date-icon" aria-hidden="true" />
        <span className="ui-plan-date-nav-date-label">Date</span>
        <input
          ref={dateInputRef}
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
