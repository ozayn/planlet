"use client";
import { useSyncExternalStore } from "react";
import type { SerializedJobApplication as Job } from "@/lib/job-applications";
import { getJobApplicationStatusLabel } from "@/lib/job-application-status";

const columns = [
  "company",
  "title",
  "status",
  "submitted",
  "location",
  "arrangement",
  "salary",
  "source",
  "nextAction",
  "qualificationGaps",
  "url",
  "created",
] as const;
type Column = (typeof columns)[number];
const labels: Record<Column, string> = {
  company: "Company",
  title: "Role",
  status: "Status",
  submitted: "Confirmed submission",
  location: "Location",
  arrangement: "Work arrangement",
  salary: "Published salary",
  source: "Source",
  nextAction: "Next action",
  qualificationGaps: "Missing qualifications",
  url: "URL",
  created: "Record created",
};
const defaultColumns: Column[] = [
  "company",
  "title",
  "status",
  "submitted",
  "nextAction",
];
const storageKey = "planlet-job-tracker-columns";
function cell(job: Job, column: Column, timezone: string) {
  const d = job.trackerDetails;
  switch (column) {
    case "status":
      return getJobApplicationStatusLabel(job.status);
    case "submitted":
      return job.submissionConfirmed ? job.submittedDate : "Unverified";
    case "arrangement":
      return d.workArrangement || "Unknown";
    case "salary":
      return d.salaryMin || d.salaryMax
        ? `${d.currency || "Currency unknown"} ${d.salaryMin || "?"} – ${d.salaryMax || "?"} / ${d.payPeriod || "period unknown"}`
        : "Unknown";
    case "nextAction":
      return [d.nextAction, d.dueDate].filter(Boolean).join(" · ");
    case "qualificationGaps":
      return (
        <span className="whitespace-pre-line">
          {d.qualificationGaps || "Not recorded"}
        </span>
      );
    case "created":
      return new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        dateStyle: "medium",
      }).format(new Date(job.createdAt));
    case "url":
      return job.url ? (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ui-text-link"
        >
          Open posting
        </a>
      ) : (
        "—"
      );
    default:
      return job[column] || "—";
  }
}
export function JobTrackerTable({
  jobs,
  onSelectJob,
  userTimezone,
}: {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  userTimezone: string;
}) {
  const snapshot = useSyncExternalStore(subscribe, readColumns, () => "null");
  let visible: Column[] = defaultColumns;
  try {
    const stored = JSON.parse(snapshot);
    if (
      Array.isArray(stored) &&
      stored.length &&
      stored.every((v) => columns.includes(v))
    )
      visible = stored;
  } catch {}
  function toggle(column: Column) {
    const next = visible.includes(column)
      ? visible.filter((v) => v !== column)
      : [...visible, column];
    if (!next.length) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("planlet-job-preferences"));
    } catch {}
  }
  return (
    <div className="space-y-3">
      <details>
        <summary className="cursor-pointer text-sm">Table columns</summary>
        <div className="mt-2 flex flex-wrap gap-x-4">
          {columns.map((c) => (
            <label key={c} className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visible.includes(c)}
                onChange={() => toggle(c)}
              />
              {labels[c]}
            </label>
          ))}
        </div>
      </details>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Job applications">
          <thead>
            <tr className="border-b border-border-soft text-start text-xs text-muted">
              {visible.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 text-start">
                  {labels[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                tabIndex={0}
                onClick={() => onSelectJob(job)}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    onSelectJob(job);
                  }
                }}
                className="cursor-pointer border-b border-border-soft hover:bg-accent-cream/30 focus-visible:outline-2"
              >
                {visible.map((c) => (
                  <td
                    key={c}
                    className="max-w-64 break-words px-3 py-3 align-top"
                  >
                    {cell(job, c, userTimezone)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function readColumns() {
  try {
    return localStorage.getItem(storageKey) ?? "null";
  } catch {
    return "null";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("planlet-job-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("planlet-job-preferences", callback);
  };
}
