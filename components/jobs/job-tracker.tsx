"use client";

import { defaultMissionPreferences, type MissionPreferences } from "@/lib/job-mission-summary";
import { credibilityStatuses } from "@/lib/job-credibility";
import { employerSizeBands } from "@/lib/job-employer-size";
import { useJobTrackerSession } from "@/lib/job-tracker-session";
import { JobReviewQueue } from "./job-review-queue";
import { governmentLabels } from "@/lib/job-government";
import { JobCategoryContext } from "./job-category-context";
import { defaultJobCategories, type JobCategory } from "@/lib/job-category-types";
import { JobTrackerInsights } from "./job-tracker-insights";
import { emptyJobFilters, matchesJobFilters } from "@/lib/job-tracker-filters";
import { insights, localDate } from "@/lib/job-tracker-insights";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import {
  archiveJobApplicationAction,
  createJobApplicationAction,
  deleteJobApplicationAction,
  listJobApplicationsAction,
  type SerializedJobApplication,
} from "@/app/(app)/jobs/actions";
import { JobApplicationEditorSheet } from "@/components/jobs/job-application-editor-sheet";
import { JobUrlExtractControls } from "@/components/jobs/job-url-extract-controls";
import { JobTrackerCardList } from "@/components/jobs/job-tracker-card-list";
import { JobTrackerEmptyState } from "@/components/jobs/job-tracker-empty-state";
import { JobTrackerUpdateNotice } from "@/components/jobs/job-tracker-update-notice";
import { JobTrackerTable } from "@/components/jobs/job-tracker-table";
import { JobTrackerViewToggle } from "@/components/jobs/job-tracker-view-toggle";
import {
  JOB_APPLICATION_FILTERS,
  JOB_APPLICATION_STATUSES,
  type JobApplicationFilter,
} from "@/lib/job-application-constants";
import { applyExtractedJobToAddForm } from "@/lib/apply-extracted-job-details";
import { getJobApplicationStatusLabel } from "@/lib/job-application-labels";
import { jobMatchesSearch } from "@/lib/job-application-search";
import {
  readStoredJobTrackerView,
  storeJobTrackerView,
  type JobTrackerView,
} from "@/lib/job-tracker-view";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { JobApplicationStatusValue } from "@/lib/job-application-status";

type JobTrackerProps = {
  initialJobs: SerializedJobApplication[];
  userId: string;
  userTimezone: string;
  categories?: JobCategory[];
  initialPreferences?: MissionPreferences;
};

type AddJobFormState = {
  url: string;
  title: string;
  company: string;
  description: string;
  appliedDate: string;
  status: JobApplicationStatusValue;
  notes: string;
  confirmSubmission: boolean;
};

const emptyForm = (): AddJobFormState => ({
  url: "",
  title: "",
  company: "",
  description: "",
  appliedDate: "",
  status: "SAVED",
  notes: "",
  confirmSubmission: false,
});

const jobFilterLabels = {
                  credibility: "Credibility check",
                  employerSize: "Hiring employer size",
                  government: "Government relationship",
                  mission: "Role / team mission",
                  industry: "Employer industry",
                  missionReview: "Mission review",
                  company: "Company",
                  role: "Role",
                  qualificationGap: "Missing qualification",
                  arrangement: "Work arrangement",
                  salary: "Published salary at least",
                  currency: "Salary currency",
                  period: "Salary pay period",
                  from: "Submitted from",
                  to: "Submitted through",
};

export function JobTracker({ userId, initialJobs, userTimezone, categories = defaultJobCategories, initialPreferences = defaultMissionPreferences }: JobTrackerProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionKey = `planlet-job-tracker:${userId}:`;
  const [insightsRange, setInsightsRange] = useJobTrackerSession(sessionKey+"range", {
    from: localDate(new Date(), userTimezone).slice(0, 7) + "-01",
    to: localDate(new Date(), userTimezone),
  });
  const [tab, setTab] = useJobTrackerSession(sessionKey+"tab", "tracker");
  const [specialView, setSpecialView] = useJobTrackerSession(sessionKey+"workflow", "all");
  const [insightSelection, setInsightSelection] = useJobTrackerSession<{
    label: string;
    ids: string[];
  } | null>(sessionKey+"chart-selection", null);
  const [fields, setFields] = useJobTrackerSession(sessionKey+"filters", emptyJobFilters());

  const [jobs, setJobs] = useState(initialJobs);
  const [filter, setFilter] = useJobTrackerSession<JobApplicationFilter>(sessionKey+"status", "ALL");
  const [searchQuery, setSearchQuery] = useJobTrackerSession(sessionKey+"search", searchParams.get("q")?.trim() ?? "");
  const [form, setForm] = useState<AddJobFormState>(() => emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] =
    useState<SerializedJobApplication | null>(null);
  const storedView = useSyncExternalStore(
    subscribeToPreferences,
    readStoredJobTrackerView,
    () => null,
  );
  const view: JobTrackerView = storedView ?? "cards";
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get("q")?.trim() ?? "";
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setSearchQuery(urlQuery);
  }
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const today = localDate(clock, userTimezone);
  const trimmedSearch = searchQuery.trim();

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (!matchesJobFilters(job, filter, specialView, fields, today, categories))
          return false;
        if (insightSelection && !insightSelection.ids.includes(job.id))
          return false;
        return !trimmedSearch || jobMatchesSearch(job, trimmedSearch);
      }),
    [jobs, filter, insightSelection, specialView, fields, today, trimmedSearch, categories],
  );
  const counts = insights(jobs, today);
  const failedCount = jobs.filter(
    (j) => !j.submissionConfirmed && j.status === "SUBMISSION_FAILED",
  ).length;
  const blockedCount = jobs.filter(
    (j) =>
      !j.submissionConfirmed &&
      j.status !== "SUBMISSION_FAILED" &&
      (j.status === "NEEDS_INPUT" ||
        j.trackerDetails.blockerType ||
        j.trackerDetails.blockerNote),
  ).length;
  const unverifiedCount =
    jobs.filter((j) => !j.submissionConfirmed).length -
    failedCount -
    blockedCount;

  function updateSearchQuery(nextQuery: string) {
    setSearchQuery(nextQuery);

    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextQuery.trim();

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function handleViewChange(nextView: JobTrackerView) {
    storeJobTrackerView(nextView);
    window.dispatchEvent(new Event("planlet-job-preferences"));
  }

  function refreshJobs() {
    startTransition(async () => {
      const nextJobs = await listJobApplicationsAction("EVERYTHING");
      setJobs(nextJobs);
      router.refresh();
    });
  }

  function handleFilterChange(nextFilter: JobApplicationFilter) {
    setFilter(nextFilter);
  }

  function clearFormErrors() {
    setError(null);
    setDuplicateWarning(false);
    setDuplicateJobId(null);
  }

  async function handleExtracted(
    details: Parameters<typeof applyExtractedJobToAddForm>[1],
    canonicalUrl?: string,
  ) {
    setForm((current) => {
      const next = applyExtractedJobToAddForm(current, details);
      return canonicalUrl ? { ...next, url: canonicalUrl } : next;
    });
  }

  function openDuplicateJob(jobId: string) {
    const existing =
      jobs.find((job) => job.id === jobId) ??
      initialJobs.find((job) => job.id === jobId);

    if (existing) {
      setSelectedJob(existing);
      clearFormErrors();
    }
  }

  function handleAddJob(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createJobApplicationAction({
        allowDuplicate: duplicateWarning,
        url: form.url,
        title: form.title,
        company: form.company,
        description: form.description,
        appliedDate: form.appliedDate.trim() || null,
        submissionDate: form.appliedDate.trim() || undefined,
        confirmSubmission: form.confirmSubmission,
        status: form.status,
        notes: form.notes,
      });

      if (!result.success) {
        setError(result.error);
        setDuplicateWarning(Boolean(result.duplicate));
        setDuplicateJobId(result.duplicateJobId ?? null);
        return;
      }

      setForm(emptyForm());
      document.getElementById("job-add-url")?.focus();
      clearFormErrors();
      refreshJobs();
    });
  }

  function handleJobSaved(job: SerializedJobApplication) {
    setSelectedJob(null);
    setJobs((current) => [
      job,
      ...current.filter((entry) => entry.id !== job.id),
    ]);
    refreshJobs();
  }

  function handleArchive(jobId: string) {
    startTransition(async () => {
      const result = await archiveJobApplicationAction(jobId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelectedJob(null);
      refreshJobs();
    });
  }

  function handleDelete(jobId: string) {
    startTransition(async () => {
      const result = await deleteJobApplicationAction(jobId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelectedJob(null);
      refreshJobs();
    });
  }

  return (
    <JobCategoryContext.Provider value={categories}>
    <div className="space-y-4">
      <JobTrackerUpdateNotice />
      <div className="flex flex-wrap gap-2">
        {["tracker", "insights", "review"].map((t) => (
          <button
            aria-pressed={tab === t}
            className={
              tab === t
                ? "ui-btn-primary min-h-10 px-4"
                : "ui-btn-secondary min-h-10 px-4"
            }
            key={t}
            onClick={() => setTab(t)}
          >
            {t === "tracker" ? "Applications" : t === "review" ? "Review queue" : "Insights"}
          </button>
        ))}
      </div>
      {tab === "review" ? <JobReviewQueue jobs={jobs} preferences={preferences} onSelect={setSelectedJob}/> : tab === "insights" ? (
        <JobTrackerInsights
          jobs={jobs}
          initialPreferences={preferences}
          onPreferencesChange={setPreferences}
          today={today}
          range={insightsRange}
          onRangeChange={setInsightsRange}
          onSelect={(label, list) => {
            setInsightSelection({ label, ids: list.map((j) => j.id) });
            setFields(emptyJobFilters());
            setSpecialView("all");
            setFilter("EVERYTHING");
            updateSearchQuery("");
            setTab("tracker");
          }}
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            {counts.today.length} confirmed today · {counts.submissions.length}{" "}
            total confirmed · {unverifiedCount} drafts / unverified ·{" "}
            {blockedCount} blocked · {failedCount} failed
          </p>
          <details>
            <summary className="ui-btn-secondary inline-flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium">Add job</summary>
            <form className="ui-card-padded mt-3 space-y-3" onSubmit={handleAddJob}>
              <label className="block space-y-1.5" htmlFor="job-add-url">
                <span className="text-xs text-muted">URL</span>
                <JobUrlExtractControls
                  url={form.url}
                  onUrlChange={(nextUrl) => setForm({ ...form, url: nextUrl })}
                  onExtracted={handleExtracted}
                  disabled={isPending}
                  urlInputId="job-add-url"
                  urlInputName="job-add-url"
                  pasteInputId="job-add-paste"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5" htmlFor="job-add-title">
                  <span className="text-xs text-muted">Title</span>
                  <input
                    id="job-add-title"
                    name="job-add-title"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    disabled={isPending}
                    placeholder="Software Engineer"
                    className="ui-input min-h-10 w-full px-3 text-sm"
                    {...passwordManagerSafeControlProps}
                  />
                </label>
                <label className="block space-y-1.5" htmlFor="job-add-company">
                  <span className="text-xs text-muted">Company</span>
                  <input
                    id="job-add-company"
                    name="job-add-company"
                    type="text"
                    value={form.company}
                    onChange={(event) =>
                      setForm({ ...form, company: event.target.value })
                    }
                    disabled={isPending}
                    placeholder="Acme Inc."
                    className="ui-input min-h-10 w-full px-3 text-sm"
                    {...passwordManagerSafeControlProps}
                  />
                </label>
              </div>

              <details>
                <summary className="cursor-pointer text-sm">
                  More details
                </summary>
                <label
                  className="block space-y-1.5"
                  htmlFor="job-add-description"
                >
                  <span className="text-xs text-muted">Description</span>
                  <textarea
                    id="job-add-description"
                    name="job-add-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    disabled={isPending}
                    rows={3}
                    placeholder="Paste or write a job description…"
                    className="ui-input w-full px-3 py-2 text-sm"
                    {...passwordManagerSafeControlProps}
                  />
                </label>

                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.confirmSubmission}
                    disabled={isPending}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        confirmSubmission: event.target.checked,
                      })
                    }
                  />
                  Successfully submitted
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className="block space-y-1.5"
                    htmlFor="job-add-applied-date"
                  >
                    <span className="text-xs text-muted">
                      Submission date (optional)
                    </span>
                    <input
                      id="job-add-applied-date"
                      name="job-add-applied-date"
                      type="date"
                      value={form.appliedDate}
                      onChange={(event) =>
                        setForm({ ...form, appliedDate: event.target.value })
                      }
                      disabled={isPending}
                      className="ui-input min-h-10 w-full px-3 text-sm"
                      {...passwordManagerSafeControlProps}
                    />
                  </label>
                  <label className="block space-y-1.5" htmlFor="job-add-status">
                    <span className="text-xs text-muted">Status</span>
                    <select
                      id="job-add-status"
                      name="job-add-status"
                      value={form.status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          status: event.target
                            .value as JobApplicationStatusValue,
                        })
                      }
                      disabled={isPending}
                      className="ui-input min-h-10 w-full px-3 text-sm"
                      {...passwordManagerSafeControlProps}
                    >
                      {JOB_APPLICATION_STATUSES.filter(
                        (status) => status !== "ARCHIVED",
                      ).map((status) => (
                        <option key={status} value={status}>
                          {getJobApplicationStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-1.5" htmlFor="job-add-notes">
                  <span className="text-xs text-muted">Notes</span>
                  <textarea
                    id="job-add-notes"
                    name="job-add-notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    disabled={isPending}
                    rows={3}
                    className="ui-input w-full px-3 py-2 text-sm"
                    {...passwordManagerSafeControlProps}
                  />
                </label>
              </details>
              {duplicateWarning && (
                <p className="text-sm">
                  Save again to keep a separate role or repost.
                </p>
              )}
              {duplicateWarning && error ? (
                <div className="space-y-2">
                  <p className="text-sm text-accent-yellow" role="alert">
                    {error}
                  </p>
                  {duplicateJobId ? (
                    <button
                      type="button"
                      onClick={() => openDuplicateJob(duplicateJobId)}
                      className="ui-btn-secondary min-h-9 px-3 text-sm"
                    >
                      Open existing job
                    </button>
                  ) : null}
                </div>
              ) : null}
              {error && !duplicateWarning ? (
                <p className="text-sm text-accent-red" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="ui-btn-primary min-h-10 px-4 text-sm"
              >
                {duplicateWarning
                  ? "Save as separate role or repost"
                  : "Save job"}
              </button>
            </form>
          </details>

          <section className="space-y-3">
            {insightSelection && (
              <button
                className="ui-btn-secondary min-h-10 px-3"
                onClick={() => setInsightSelection(null)}
              >
                {insightSelection.label} ({insightSelection.ids.length}) × Clear
              </button>
            )}
            <div className="flex flex-wrap items-end gap-2">
            <div className="relative min-w-48 flex-1">
              <label htmlFor="job-search" className="sr-only">
                Search jobs
              </label>
              <input
                id="job-search"
                name="job-search"
                type="search"
                value={searchQuery}
                onChange={(event) => updateSearchQuery(event.target.value)}
                placeholder="Search jobs, companies, notes…"
                disabled={isPending}
                aria-label="Search jobs"
                className="ui-input min-h-10 w-full px-3 pe-9 text-sm"
                {...passwordManagerSafeControlProps}
              />
              {trimmedSearch ? (
                <button
                  type="button"
                  onClick={() => updateSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute end-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent-cream/60 hover:text-foreground"
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>            <label className="text-xs">
              Workflow
              <select
                className="ui-input ms-2 min-h-10 px-3"
                value={specialView}
                onChange={(e) => {
                  setSpecialView(e.target.value);
                  setInsightSelection(null);
                }}
              >
                <option value="all">All applications</option>
                <option value="attention">Needs attention</option>
                <option value="followup">Follow-up due</option>
                <option value="today">Applied today</option>
              </select>
            </label>


            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">
                Status
                <select
                  className="ui-input ms-2 min-h-10 px-3"
                  value={filter}
                  onChange={(e) =>
                    handleFilterChange(e.target.value as JobApplicationFilter)
                  }
                >
                  {JOB_APPLICATION_FILTERS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>

              <a href="/admin/job-categories" target="_blank" rel="noreferrer" className="ui-text-link min-h-10 px-2 text-xs">Categories</a>
              <JobTrackerViewToggle
                view={view}
                disabled={isPending}
                onChange={handleViewChange}
              />
            </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {Object.entries(fields).filter(([,value])=>value).map(([key,value])=><button key={key} className="ui-input min-h-9 px-2" onClick={()=>setFields({...fields,[key]:""})} aria-label={`Remove ${jobFilterLabels[key as keyof typeof jobFilterLabels]} filter: ${value}`}>{jobFilterLabels[key as keyof typeof jobFilterLabels]}: {value} ×</button>)}
              {(Object.values(fields).some(Boolean)||trimmedSearch||filter!=="ALL"||specialView!=="all"||insightSelection)&&<button className="ui-text-link min-h-9 px-2" onClick={()=>{setFields(emptyJobFilters());setFilter("ALL");setSpecialView("all");setInsightSelection(null);updateSearchQuery("");}}>Clear all</button>}
            </div>
            <details>
              <summary className="cursor-pointer text-sm">Filters</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {Object.entries(jobFilterLabels).map(([key, label]) => (
                  <label key={key} className="text-xs">
                    {label}
                    {["arrangement", "period", "mission", "industry", "missionReview", "government", "employerSize", "credibility"].includes(key) ? (
                      <select
                        className="ui-input block min-h-10 w-full px-3"
                        value={fields[key as keyof typeof fields]}
                        onChange={(e) =>
                          setFields({ ...fields, [key]: e.target.value })
                        }
                      >
                        {(key === "credibility" ? ["",...credibilityStatuses] : key === "employerSize" ? ["",...employerSizeBands] : key === "government" ? ["", ...Object.keys(governmentLabels)] : key === "mission" || key === "industry"
                          ? ["", "Unknown", ...new Set([...categories.filter(c => !c.retired).map(c => c.label), ...jobs.flatMap(j => key === "mission" ? j.trackerDetails.missionFields ?? [] : j.trackerDetails.employerIndustries ?? [])])]
                          : key === "missionReview"
                          ? ["", "Mission needs review", "Mission conflict", "Mission recorded"]
                          : key === "arrangement"
                          ? ["", "Remote", "Hybrid", "On-site"]
                          : ["", "Hour", "Day", "Week", "Month", "Year"]
                        ).map((v) => (
                          <option key={v} value={v}>
                            {(key === "government" ? governmentLabels[v as keyof typeof governmentLabels] : v) || "Any"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="ui-input block min-h-10 w-full px-3"
                        type={
                          key === "from" || key === "to"
                            ? "date"
                            : key === "salary"
                              ? "number"
                              : "text"
                        }
                        value={fields[key as keyof typeof fields]}
                        onChange={(e) =>
                          setFields({ ...fields, [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            </details>

            {filteredJobs.length === 0 ? (
              <JobTrackerEmptyState
                hasJobs={jobs.length > 0}
                searchQuery={trimmedSearch}
                onClearSearch={() => {
                  updateSearchQuery("");
                  setFields(emptyJobFilters());
                  setInsightSelection(null);
                  setSpecialView("all");
                  setFilter("ALL");
                }}
              />
            ) : view === "table" ? (
              <><div className="hidden lg:block"><JobTrackerTable jobs={filteredJobs} onSelectJob={setSelectedJob} userTimezone={userTimezone}/></div><div className="lg:hidden"><JobTrackerCardList jobs={filteredJobs} onSelectJob={setSelectedJob}/></div></>
            ) : (
              <JobTrackerCardList
                jobs={filteredJobs}
                onSelectJob={setSelectedJob}
              />
            )}
          </section>
        </>
      )}
      <JobApplicationEditorSheet
        key={selectedJob?.id ?? "closed"}
        job={selectedJob}
        userTimezone={userTimezone}
        open={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
        onSaved={handleJobSaved}
        onArchive={handleArchive}
        onDelete={handleDelete}
        isPending={isPending}
        jobs={jobs}
        onOpenJob={(job) => {
          setSelectedJob(job);
          clearFormErrors();
        }}
      />
    </div>
    </JobCategoryContext.Provider>
  );
}

function subscribeToPreferences(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("planlet-job-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("planlet-job-preferences", callback);
  };
}
