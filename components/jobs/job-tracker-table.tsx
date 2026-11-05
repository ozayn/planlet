"use client";
import { useJobCategories } from "./job-category-context";
import { credibilityConcern, credibilityLabel } from "@/lib/job-credibility";
import { hiringEmployerSize } from "@/lib/job-employer-size";
import { governmentLabel } from "@/lib/job-government";
import { missionSummary, missionReview } from "@/lib/job-missions";
import { applicationDate, sortByApplicationDate } from "@/lib/job-tracker-sort";
import { useState, useSyncExternalStore } from "react";
import type { SerializedJobApplication as Job } from "@/lib/job-applications";
import { getJobApplicationStatusLabel } from "@/lib/job-application-status";

const columns = [
  "government",
  "mission",
  "industry",
  "employerSize",
  "credibility",
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
  government: "Government relationship",
  mission: "Role / team mission",
  industry: "Employer industry",
  employerSize: "Hiring employer size",
  credibility: "Credibility check",
  company: "Company",
  title: "Role",
  status: "Status",
  submitted: "Application date",
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
  "mission",
  "credibility",
 ];
const storageKey = "planlet-job-tracker-columns";
function cell(job: Job, column: Column, timezone: string, categories: ReturnType<typeof useJobCategories>) {
  const d = job.trackerDetails;
  switch (column) {
    case "credibility":
      return <span className={credibilityConcern(d)?"text-accent-red":""}>{credibilityConcern(d)?"⚠ ":""}{credibilityLabel(d)}</span>;
    case "employerSize":
      return hiringEmployerSize(job);
    case "government":
      return governmentLabel(d);
    case "mission":
      return <span title={missionReview(d,categories)!=="Mission recorded"?missionReview(d,categories):undefined}>{missionReview(d,categories)!=="Mission recorded"&&<span aria-label={missionReview(d,categories)}>⚠ </span>}{missionSummary(d)}</span>;
    case "industry":
      return d.employerIndustries?.join(" · ") || "Unknown";
    case "status":
      return getJobApplicationStatusLabel(job.status);
    case "submitted":
      return applicationDate(job) ? (
        <span className="whitespace-nowrap">
          {applicationDate(job)}
          {!job.submissionConfirmed && (
            <span className="block text-xs text-muted">Unverified</span>
          )}
        </span>
      ) : (
        "—"
      );
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
  const categories = useJobCategories();
  const [dateOrder, setDateOrder] = useState<"asc" | "desc">("desc");
  const sortedJobs = sortByApplicationDate(jobs, dateOrder);
  const resultKey = JSON.stringify([dateOrder, jobs.map((job) => job.id)]);
  const [paging, setPaging] = useState({ key: resultKey, page: 1 });
  const [pageSize, setPageSize] = useState(20);
  const pageCount = Math.max(1, Math.ceil(jobs.length / pageSize));
  const page = paging.key === resultKey ? Math.min(paging.page, pageCount) : 1;
  const start = (page - 1) * pageSize;
  const pageJobs = sortedJobs.slice(start, start + pageSize);
  function goToPage(next: number) {
    setPaging({ key: resultKey, page: Math.max(1, Math.min(next, pageCount)) });
  }
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
                <th
                  key={c}
                  scope="col"
                  className="px-3 py-2 text-start"
                  aria-sort={
                    c === "submitted"
                      ? dateOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {c === "submitted" ? (
                    <button
                      className="min-h-10 text-start"
                      onClick={() =>
                        setDateOrder(dateOrder === "desc" ? "asc" : "desc")
                      }
                      aria-label={`Application date, ${dateOrder === "desc" ? "newest" : "oldest"} first; click to reverse`}
                    >
                      {labels[c]} {dateOrder === "desc" ? "↓" : "↑"}
                    </button>
                  ) : (
                    labels[c]
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageJobs.map((job) => (
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
                    className={`break-words px-3 py-2 align-top ${c==="submitted"||c==="created"?"whitespace-nowrap":c==="title"?"min-w-48 max-w-80":c==="mission"?"max-w-56":"max-w-48"}`}
                  >
                    {c==="title" ? <button className="ui-text-link min-h-9 text-start font-medium" onClick={event=>{event.stopPropagation();onSelectJob(job);}}>{job.title}</button> : cell(job, c, userTimezone, categories)}
                    {c==="title"&&!visible.includes("credibility")&&credibilityConcern(job.trackerDetails)&&<span className="block text-xs text-accent-red" title={job.trackerDetails.credibilityEvidence}>Credibility: {job.trackerDetails.credibilityCheck}</span>}
                    {c === "title" && !visible.includes("mission") && <span className="mt-1 block text-xs text-muted">Mission: {missionSummary(job.trackerDetails)}{missionReview(job.trackerDetails,categories)!=="Mission recorded"?` · ${missionReview(job.trackerDetails,categories)}`:""}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Application table pages" className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span role="status">{jobs.length ? start + 1 : 0}–{Math.min(start + pageSize, jobs.length)} of {jobs.length} applications</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            Rows
            <select className="ui-input min-h-10 px-2" value={pageSize} onChange={(event) => {
              setPageSize(Number(event.target.value));
              goToPage(1);
            }}>
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button className="ui-input min-h-9 px-2 disabled:opacity-40" disabled={page === 1} onClick={() => goToPage(page - 1)} aria-label="Previous page">‹</button>
          <span className="whitespace-nowrap">{page} / {pageCount}</span>
          <button className="ui-input min-h-9 px-2 disabled:opacity-40" disabled={page === pageCount} onClick={() => goToPage(page + 1)} aria-label="Next page">›</button>
        </div>
      </nav>

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
