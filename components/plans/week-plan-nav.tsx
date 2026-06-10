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
  formatWeekNavLabel,
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
  const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPickerValue(currentWeekStart);
    setIsWeekPickerOpen(false);
  }, [currentWeekStart]);

  useEffect(() => {
    if (!isWeekPickerOpen) {
      return;
    }

    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, [isWeekPickerOpen]);

  function openWeek(dateString: string) {
    setIsWeekPickerOpen(false);
    router.push(
      `/plans/week/${formatWeekStartString(parseDateString(dateString))}`,
    );
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
          {formatWeekNavLabel(currentWeekStart)}
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

        <button
          type="button"
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-icon ui-plan-date-nav-btn-calendar${
            isWeekPickerOpen ? " ui-plan-date-nav-btn-active" : ""
          }`}
          aria-label={ACTION_LABELS.chooseWeek.ariaLabel}
          title={ACTION_LABELS.chooseWeek.title}
          aria-expanded={isWeekPickerOpen}
          aria-controls="week-plan-nav-date"
          onClick={() => setIsWeekPickerOpen((open) => !open)}
          {...passwordManagerSafeControlProps}
        >
          <CalendarIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">
            {ACTION_LABELS.chooseWeek.title}
          </span>
        </button>
      </div>

      <label
        htmlFor="week-plan-nav-date"
        className={`ui-plan-date-nav-date ${
          isWeekPickerOpen ? "flex" : "hidden sm:flex"
        }`}
      >
        <CalendarIcon className="ui-plan-date-nav-date-icon" aria-hidden="true" />
        <span className="ui-plan-date-nav-date-label">Week</span>
        <input
          ref={dateInputRef}
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
