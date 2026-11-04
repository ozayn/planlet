"use client";
import { useState } from "react";
import type { SerializedJobApplication as Job } from "@/lib/job-applications";
import {
  insights,
  groupJobs,
  outcome,
  roleCategory,
  sourceCategory,
  weekStart,
} from "@/lib/job-tracker-insights";
function Bars({
  label,
  groups,
  onSelect,
}: {
  label: string;
  groups: [string, Job[]][];
  onSelect: (label: string, jobs: Job[]) => void;
}) {
  const max = Math.max(1, ...groups.map(([, j]) => j.length));
  return (
    <article className="ui-card-padded space-y-3">
      <h3 className="text-sm font-medium">{label}</h3>
      <div className="max-h-64 space-y-3 overflow-y-auto">
        {groups.length ? (
          groups.map(([key, jobs]) => (
            <button
              key={key}
              className="block min-h-10 w-full text-start text-sm"
              onClick={() => onSelect(`${label}: ${key}`, jobs)}
            >
              <span className="flex justify-between gap-3">
                <span>{key}</span>
                <span>{jobs.length}</span>
              </span>
              <span className="mt-1 block h-3 rounded bg-accent-cream">
                <span
                  className="block h-3 rounded bg-foreground/60"
                  style={{ width: `${(jobs.length / max) * 100}%` }}
                />
              </span>
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">No data in this range.</p>
        )}
      </div>
    </article>
  );
}
export function JobTrackerInsights({
  jobs,
  today,
  onSelect,
  range: selectedRange,
  onRangeChange,
}: {
  jobs: Job[];
  today: string;
  range: { from: string; to: string };
  onRangeChange: (range: { from: string; to: string }) => void;
  onSelect: (label: string, jobs: Job[]) => void;
}) {
  const { from, to } = selectedRange;
  const validRange =
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from <= to;
  const setFrom = (from: string) => onRangeChange({ ...selectedRange, from });
  const setTo = (to: string) => onRangeChange({ ...selectedRange, to });
  const [period, setPeriod] = useState("daily");
  const range = jobs.filter(
    (j) =>
      j.submissionConfirmed &&
      !!j.submittedDate &&
      j.submittedDate >= from &&
      j.submittedDate <= to,
  );
  const data = insights(range, today);
  const due = jobs.filter(
    (j) =>
      j.status !== "ARCHIVED" &&
      !!j.trackerDetails.nextAction &&
      !!j.trackerDetails.dueDate &&
      j.trackerDetails.dueDate >= from &&
      j.trackerDetails.dueDate <= to &&
      j.trackerDetails.dueDate <= today,
  );
  const cards: [string, Job[]][] = [
    ["Confirmed in range", range],
    ["Confirmed today", data.today],
    ["This week", data.week],
    ["This month", data.month],
    ["Awaiting response", data.awaiting],
    ["Interviews", data.interviews],
    ["Offers", data.offers],
    ["Follow-ups due in range", due],
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium">Application summary</h2>
      <p className="text-sm text-muted">
        {from} – {to} · Local dates · Current recorded outcomes
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs">
          From
          <input
            className="ui-input block min-h-10 px-3"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs">
          To
          <input
            className="ui-input block min-h-10 px-3"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Group by
          <select
            className="ui-input block min-h-10 px-3"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="daily">Day</option>
            <option value="weekly">Week</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, list]) => (
          <button
            disabled={!validRange}
            key={label}
            className="ui-card-padded text-start"
            onClick={() => onSelect(label, list)}
          >
            <span className="block text-2xl">{list.length}</span>
            <span className="text-xs text-muted">{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Confirmed submissions only. Weeks start Monday.
      </p>
      {!validRange ? (
        <p role="alert">Choose a start date and an end date on or after it.</p>
      ) : !range.length ? (
        <div className="ui-empty-state space-y-2">
          <p className="text-sm text-muted">
            No confirmed submissions in this range. Change the dates or review
            your unverified applications.
          </p>
          <button
            className="ui-text-link min-h-10 text-sm"
            onClick={() =>
              onSelect(
                "Unverified applications",
                jobs.filter((job) => !job.submissionConfirmed),
              )
            }
          >
            Review unverified applications
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Bars
            label="Applications over time"
            groups={groupJobs(range, (j) =>
              period === "weekly"
                ? weekStart(j.submittedDate!)
                : j.submittedDate!,
            )}
            onSelect={onSelect}
          />
          <Bars
            label="Application outcomes"
            groups={groupJobs(range, outcome)}
            onSelect={onSelect}
          />
          <Bars
            label="Applications by role"
            groups={groupJobs(range, roleCategory)}
            onSelect={onSelect}
          />
          <Bars
            label="Applications by source"
            groups={groupJobs(range, sourceCategory)}
            onSelect={onSelect}
          />
        </div>
      )}
      <p className="text-xs text-muted">
        Role categories can be changed in job details.
      </p>
    </section>
  );
}
