"use client";

import type { PlanType } from "@/app/generated/prisma/client";

import {
  dateStringToMonthValue,
  dateStringToYearValue,
  formatPlanTargetSummary,
  getPlanTargetTypeLabel,
  monthValueToDateString,
  PLAN_TARGET_TYPES,
  yearValueToDateString,
} from "@/lib/plan-target";

type PlanTargetSelectorProps = {
  planType: PlanType;
  selectedDate: string;
  onPlanTypeChange: (planType: PlanType) => void;
  onSelectedDateChange: (dateString: string) => void;
};

export function PlanTargetSelector({
  planType,
  selectedDate,
  onPlanTypeChange,
  onSelectedDateChange,
}: PlanTargetSelectorProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border-soft bg-surface-muted/30 px-4 py-3">
      <p className="text-sm font-medium text-foreground">Plan for</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <fieldset className="min-w-0">
          <legend className="sr-only">Plan type</legend>
          <div className="flex flex-wrap gap-2">
            {PLAN_TARGET_TYPES.map((type) => (
              <label
                key={type}
                className={`flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-sm transition-colors ${
                  planType === type ? "ui-segment-active" : "ui-segment"
                }`}
              >
                <input
                  id={`plan-target-type-${type}`}
                  type="radio"
                  name="plan-target-type"
                  value={type}
                  checked={planType === type}
                  onChange={() => onPlanTypeChange(type)}
                  className="sr-only"
                />
                {getPlanTargetTypeLabel(type)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="min-w-0 flex-1">
          {planType === "MONTH" ? (
            <label htmlFor="plan-target-month" className="block space-y-1">
              <span className="sr-only">Month</span>
              <input
                id="plan-target-month"
                name="planTargetMonth"
                type="month"
                value={dateStringToMonthValue(selectedDate)}
                onChange={(event) =>
                  onSelectedDateChange(monthValueToDateString(event.target.value))
                }
                className="ui-input min-h-10 w-full py-2"
              />
            </label>
          ) : planType === "YEAR" ? (
            <label htmlFor="plan-target-year" className="block space-y-1">
              <span className="sr-only">Year</span>
              <input
                id="plan-target-year"
                name="planTargetYear"
                type="number"
                min={2000}
                max={2100}
                step={1}
                value={dateStringToYearValue(selectedDate)}
                onChange={(event) =>
                  onSelectedDateChange(yearValueToDateString(event.target.value))
                }
                className="ui-input min-h-10 w-full py-2"
              />
            </label>
          ) : (
            <label htmlFor="plan-date" className="block space-y-1">
              <span className="sr-only">Date</span>
              <input
                id="plan-date"
                name="planDate"
                type="date"
                value={selectedDate}
                onChange={(event) => onSelectedDateChange(event.target.value)}
                className="ui-input min-h-10 w-full py-2"
              />
            </label>
          )}
        </div>
      </div>

      <p className="text-xs text-muted">
        {formatPlanTargetSummary(planType, selectedDate)}
      </p>
    </div>
  );
}
