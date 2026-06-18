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
  formatYearNavLabel,
  formatYearStartString,
  parseDateString,
  shiftYearString,
} from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type YearPlanNavProps = {
  currentYearStart: string;
};

function toYearPickerValue(yearStart: string): string {
  return yearStart.slice(0, 4);
}

export function YearPlanNav({ currentYearStart }: YearPlanNavProps) {
  const router = useRouter();
  const thisYearStart = formatYearStartString(new Date());
  const [pickerValue, setPickerValue] = useState(
    toYearPickerValue(currentYearStart),
  );
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPickerValue(toYearPickerValue(currentYearStart));
    setIsYearPickerOpen(false);
  }, [currentYearStart]);

  useEffect(() => {
    if (!isYearPickerOpen) {
      return;
    }

    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, [isYearPickerOpen]);

  function openYear(yearValue: string) {
    setIsYearPickerOpen(false);
    const yearStart = formatYearStartString(
      parseDateString(`${yearValue}-01-01`),
    );
    router.push(`/plans/year/${yearStart}`);
  }

  return (
    <nav className="ui-plan-date-nav" aria-label="Year plan navigation">
      <div className="ui-plan-date-nav-controls">
        <Link
          href={`/plans/year/${shiftYearString(currentYearStart, -1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label={ACTION_LABELS.previousYear.ariaLabel}
          title={ACTION_LABELS.previousYear.title}
          {...passwordManagerSafeControlProps}
        >
          <ChevronLeftIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Previous year</span>
        </Link>

        <Link
          href={`/plans/year/${thisYearStart}`}
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-today${
            currentYearStart === thisYearStart
              ? " ui-plan-date-nav-btn-active"
              : ""
          }`}
          aria-current={
            currentYearStart === thisYearStart ? "page" : undefined
          }
          {...passwordManagerSafeControlProps}
        >
          {formatYearNavLabel(currentYearStart)}
        </Link>

        <Link
          href={`/plans/year/${shiftYearString(currentYearStart, 1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label={ACTION_LABELS.nextYear.ariaLabel}
          title={ACTION_LABELS.nextYear.title}
          {...passwordManagerSafeControlProps}
        >
          <ChevronRightIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Next year</span>
        </Link>

        <button
          type="button"
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-icon ui-plan-date-nav-btn-calendar${
            isYearPickerOpen ? " ui-plan-date-nav-btn-active" : ""
          }`}
          aria-label={ACTION_LABELS.chooseYear.ariaLabel}
          title={ACTION_LABELS.chooseYear.title}
          aria-expanded={isYearPickerOpen}
          aria-controls="year-plan-nav-date"
          onClick={() => setIsYearPickerOpen((open) => !open)}
          {...passwordManagerSafeControlProps}
        >
          <CalendarIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">
            {ACTION_LABELS.chooseYear.title}
          </span>
        </button>
      </div>

      <label
        htmlFor="year-plan-nav-date"
        className={`ui-plan-date-nav-date ${
          isYearPickerOpen ? "flex" : "hidden"
        }`}
      >
        <CalendarIcon className="ui-plan-date-nav-date-icon" aria-hidden="true" />
        <span className="ui-plan-date-nav-date-label">Year</span>
        <input
          ref={dateInputRef}
          id="year-plan-nav-date"
          name="yearPlanNavDate"
          type="number"
          inputMode="numeric"
          min={1970}
          max={2100}
          step={1}
          {...passwordManagerSafeControlProps}
          value={pickerValue}
          onChange={(event) => {
            const value = event.target.value;
            setPickerValue(value);
            if (value.length === 4) {
              openYear(value);
            }
          }}
          className="ui-plan-date-nav-date-input"
          aria-label={ACTION_LABELS.chooseYear.ariaLabel}
        />
      </label>
    </nav>
  );
}
