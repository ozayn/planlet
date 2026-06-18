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
  formatMonthNavLabel,
  formatMonthStartString,
  parseDateString,
  shiftMonthString,
} from "@/lib/dates";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type MonthPlanNavProps = {
  currentMonthStart: string;
};

function toMonthPickerValue(monthStart: string): string {
  return monthStart.slice(0, 7);
}

export function MonthPlanNav({ currentMonthStart }: MonthPlanNavProps) {
  const router = useRouter();
  const thisMonthStart = formatMonthStartString(new Date());
  const [pickerValue, setPickerValue] = useState(
    toMonthPickerValue(currentMonthStart),
  );
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPickerValue(toMonthPickerValue(currentMonthStart));
    setIsMonthPickerOpen(false);
  }, [currentMonthStart]);

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return;
    }

    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, [isMonthPickerOpen]);

  function openMonth(monthValue: string) {
    setIsMonthPickerOpen(false);
    const monthStart = formatMonthStartString(
      parseDateString(`${monthValue}-01`),
    );
    router.push(`/plans/month/${monthStart}`);
  }

  return (
    <nav className="ui-plan-date-nav" aria-label="Month plan navigation">
      <div className="ui-plan-date-nav-controls">
        <Link
          href={`/plans/month/${shiftMonthString(currentMonthStart, -1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label={ACTION_LABELS.previousMonth.ariaLabel}
          title={ACTION_LABELS.previousMonth.title}
          {...passwordManagerSafeControlProps}
        >
          <ChevronLeftIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Previous month</span>
        </Link>

        <Link
          href={`/plans/month/${thisMonthStart}`}
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-today${
            currentMonthStart === thisMonthStart
              ? " ui-plan-date-nav-btn-active"
              : ""
          }`}
          aria-current={
            currentMonthStart === thisMonthStart ? "page" : undefined
          }
          {...passwordManagerSafeControlProps}
        >
          {formatMonthNavLabel(currentMonthStart)}
        </Link>

        <Link
          href={`/plans/month/${shiftMonthString(currentMonthStart, 1)}`}
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon"
          aria-label={ACTION_LABELS.nextMonth.ariaLabel}
          title={ACTION_LABELS.nextMonth.title}
          {...passwordManagerSafeControlProps}
        >
          <ChevronRightIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">Next month</span>
        </Link>

        <button
          type="button"
          className={`ui-plan-date-nav-btn ui-plan-date-nav-btn-icon ui-plan-date-nav-btn-calendar${
            isMonthPickerOpen ? " ui-plan-date-nav-btn-active" : ""
          }`}
          aria-label={ACTION_LABELS.chooseMonth.ariaLabel}
          title={ACTION_LABELS.chooseMonth.title}
          aria-expanded={isMonthPickerOpen}
          aria-controls="month-plan-nav-date"
          onClick={() => setIsMonthPickerOpen((open) => !open)}
          {...passwordManagerSafeControlProps}
        >
          <CalendarIcon className="ui-plan-date-nav-btn-glyph" aria-hidden="true" />
          <span className="ui-plan-date-nav-btn-text">
            {ACTION_LABELS.chooseMonth.title}
          </span>
        </button>
      </div>

      <label
        htmlFor="month-plan-nav-date"
        className={`ui-plan-date-nav-date ${
          isMonthPickerOpen ? "flex" : "hidden"
        }`}
      >
        <CalendarIcon className="ui-plan-date-nav-date-icon" aria-hidden="true" />
        <span className="ui-plan-date-nav-date-label">Month</span>
        <input
          ref={dateInputRef}
          id="month-plan-nav-date"
          name="monthPlanNavDate"
          type="month"
          {...passwordManagerSafeControlProps}
          value={pickerValue}
          onChange={(event) => {
            const value = event.target.value;
            setPickerValue(value);
            if (value) {
              openMonth(value);
            }
          }}
          className="ui-plan-date-nav-date-input"
          aria-label={ACTION_LABELS.chooseMonth.ariaLabel}
        />
      </label>
    </nav>
  );
}
