"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatDateString,
  formatWeekStartString,
  parseDateString,
} from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type QuickOpenRowProps = {
  label: string;
  inputId: string;
  inputName: string;
  date: string;
  onDateChange: (value: string) => void;
  onOpen: () => void;
  inputAriaLabel: string;
};

function QuickOpenRow({
  label,
  inputId,
  inputName,
  date,
  onDateChange,
  onOpen,
  inputAriaLabel,
}: QuickOpenRowProps) {
  return (
    <div className="ui-plans-quick-open-row flex items-center gap-2">
      <span className="ui-plans-quick-open-label w-10 shrink-0 text-sm text-muted">
        {label}
      </span>
      <input
        id={inputId}
        name={inputName}
        type="date"
        value={date}
        onChange={(event) => onDateChange(event.target.value)}
        {...passwordManagerSafeControlProps}
        className="ui-input ui-input-compact min-h-9 min-w-0 flex-1"
        aria-label={inputAriaLabel}
      />
      <button
        type="button"
        onClick={onOpen}
        disabled={!date}
        {...passwordManagerSafeControlProps}
        className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-3"
      >
        Open
      </button>
    </div>
  );
}

export function PlanQuickOpen() {
  const router = useRouter();
  const today = formatDateString(new Date());
  const [dayDate, setDayDate] = useState(today);
  const [weekDate, setWeekDate] = useState(today);

  return (
    <section className="ui-plans-quick-open">
      <h2 className="ui-plans-section-title">Quick open</h2>
      <p className="text-xs text-muted-light">
        Open or create plans by date.
      </p>
      <div className="ui-plans-quick-open-rows space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        <QuickOpenRow
          label="Day"
          inputId="plan-quick-open-day"
          inputName="planQuickOpenDay"
          date={dayDate}
          onDateChange={setDayDate}
          onOpen={() => dayDate && router.push(`/plans/day/${dayDate}`)}
          inputAriaLabel="Plan date"
        />
        <QuickOpenRow
          label="Week"
          inputId="plan-quick-open-week"
          inputName="planQuickOpenWeek"
          date={weekDate}
          onDateChange={setWeekDate}
          onOpen={() =>
            weekDate &&
            router.push(
              `/plans/week/${formatWeekStartString(parseDateString(weekDate))}`,
            )
          }
          inputAriaLabel="Week containing date"
        />
      </div>
    </section>
  );
}
