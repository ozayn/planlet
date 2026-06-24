"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  archiveJobApplicationAction,
  createJobApplicationAction,
  deleteJobApplicationAction,
  extractJobFromUrlAction,
  listJobApplicationsAction,
  type SerializedJobApplication,
} from "@/app/(app)/jobs/actions";
import { JobApplicationEditorSheet } from "@/components/jobs/job-application-editor-sheet";
import { JobTrackerCardList } from "@/components/jobs/job-tracker-card-list";
import { JobTrackerEmptyState } from "@/components/jobs/job-tracker-empty-state";
import { JobTrackerTable } from "@/components/jobs/job-tracker-table";
import { JobTrackerViewToggle } from "@/components/jobs/job-tracker-view-toggle";
import {
  JOB_APPLICATION_FILTERS,
  JOB_APPLICATION_STATUSES,
  type JobApplicationFilter,
} from "@/lib/job-application-constants";
import { applyExtractedJobToAddForm } from "@/lib/apply-extracted-job-details";
import {
  getJobApplicationStatusLabel,
} from "@/lib/job-application-labels";
import { formatDateString } from "@/lib/dates";
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
};

type AddJobFormState = {
  url: string;
  title: string;
  company: string;
  appliedDate: string;
  status: JobApplicationStatusValue;
  notes: string;
};

const emptyForm = (): AddJobFormState => ({
  url: "",
  title: "",
  company: "",
  appliedDate: formatDateString(new Date()),
  status: "APPLIED",
  notes: "",
});

export function JobTracker({ initialJobs }: JobTrackerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState(initialJobs);
  const [filter, setFilter] = useState<JobApplicationFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q")?.trim() ?? "",
  );
  const [form, setForm] = useState<AddJobFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedJob, setSelectedJob] = useState<SerializedJobApplication | null>(
    null,
  );
  const [view, setView] = useState<JobTrackerView>("cards");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchQuery(searchParams.get("q")?.trim() ?? "");
  }, [searchParams]);

  useEffect(() => {
    const stored = readStoredJobTrackerView();
    if (stored) {
      setView(stored);
    }
  }, []);

  const trimmedSearch = searchQuery.trim();

  const filteredJobs = useMemo(() => {
    if (!trimmedSearch) {
      return jobs;
    }

    return jobs.filter((job) => jobMatchesSearch(job, trimmedSearch));
  }, [jobs, trimmedSearch]);

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
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleViewChange(nextView: JobTrackerView) {
    setView(nextView);
    storeJobTrackerView(nextView);
  }

  function refreshJobs(nextFilter: JobApplicationFilter) {
    startTransition(async () => {
      const nextJobs = await listJobApplicationsAction(nextFilter);
      setJobs(nextJobs);
      router.refresh();
    });
  }

  function handleFilterChange(nextFilter: JobApplicationFilter) {
    setFilter(nextFilter);
    refreshJobs(nextFilter);
  }

  async function handleFetchDetails() {
    const url = form.url.trim();
    if (!url || isFetching) {
      return;
    }

    setFetchNotice(null);
    setIsFetching(true);

    try {
      const result = await extractJobFromUrlAction(url);
      if (!result.ok) {
        setFetchNotice({ tone: "error", message: result.message });
        return;
      }

      setForm((current) => applyExtractedJobToAddForm(current, result.details));
      setFetchNotice({
        tone: "success",
        message: "Details filled in. Review before saving.",
      });
    } finally {
      setIsFetching(false);
    }
  }

  function handleAddJob(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) {
      return;
    }

    setError(null);
    setDuplicateWarning(false);

    startTransition(async () => {
      const result = await createJobApplicationAction({
        url: form.url,
        title: form.title,
        company: form.company,
        appliedDate: form.appliedDate,
        status: form.status,
        notes: form.notes,
      });

      if (!result.success) {
        setError(result.error);
        setDuplicateWarning(Boolean(result.duplicate));
        return;
      }

      setForm(emptyForm());
      setFetchNotice(null);
      refreshJobs(filter);
    });
  }

  function handleJobSaved(job: SerializedJobApplication) {
    setSelectedJob(null);
    setJobs((current) => {
      const without = current.filter((entry) => entry.id !== job.id);
      if (filter === "ALL" && job.status === "ARCHIVED") {
        return without;
      }
      if (filter !== "ALL" && job.status !== filter) {
        return without;
      }
      return [job, ...without];
    });
    refreshJobs(filter);
  }

  function handleArchive(jobId: string) {
    startTransition(async () => {
      const result = await archiveJobApplicationAction(jobId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelectedJob(null);
      refreshJobs(filter);
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
      refreshJobs(filter);
    });
  }

  return (
    <div className="space-y-6">
      <article className="ui-card-padded space-y-4 border border-border-soft">
        <h2 className="text-sm font-medium text-foreground">Add job</h2>
        <form className="space-y-3" onSubmit={handleAddJob}>
          <label className="block space-y-1.5" htmlFor="job-add-url">
            <span className="text-xs text-muted">URL</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="job-add-url"
                name="job-add-url"
                type="url"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="https://..."
                disabled={isPending}
                className="ui-input min-h-10 flex-1 px-3 text-sm"
                {...passwordManagerSafeControlProps}
              />
              <button
                type="button"
                disabled={isFetching || !form.url.trim()}
                onClick={handleFetchDetails}
                className="ui-btn-secondary min-h-10 px-3 text-sm"
              >
                {isFetching ? "Fetching…" : "Fetch details"}
              </button>
            </div>
            {fetchNotice ? (
              <p
                className={`text-sm ${
                  fetchNotice.tone === "error"
                    ? "text-accent-yellow"
                    : "text-muted"
                }`}
                role={fetchNotice.tone === "error" ? "alert" : "status"}
              >
                {fetchNotice.message}
              </p>
            ) : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5" htmlFor="job-add-title">
              <span className="text-xs text-muted">Title</span>
              <input
                id="job-add-title"
                name="job-add-title"
                type="text"
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                disabled={isPending}
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
                required
                value={form.company}
                onChange={(event) =>
                  setForm({ ...form, company: event.target.value })
                }
                disabled={isPending}
                className="ui-input min-h-10 w-full px-3 text-sm"
                {...passwordManagerSafeControlProps}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5" htmlFor="job-add-applied-date">
              <span className="text-xs text-muted">Applied date</span>
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
                    status: event.target.value as JobApplicationStatusValue,
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
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              disabled={isPending}
              rows={3}
              className="ui-input w-full px-3 py-2 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>

          {duplicateWarning ? (
            <p className="text-sm text-accent-yellow" role="alert">
              You already saved this job.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-accent-red" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="ui-btn-primary min-h-10 px-4 text-sm"
          >
            Save job
          </button>
        </form>
      </article>

      <section className="space-y-3">
        <div className="relative">
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
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {JOB_APPLICATION_FILTERS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                disabled={isPending}
                onClick={() => handleFilterChange(entry.value)}
                className={`min-h-9 rounded-lg px-3 text-sm transition-colors ${
                  filter === entry.value ? "ui-segment-active" : "ui-segment"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <JobTrackerViewToggle
            view={view}
            disabled={isPending}
            onChange={handleViewChange}
          />
        </div>

        {filteredJobs.length === 0 ? (
          <JobTrackerEmptyState
            hasJobs={jobs.length > 0}
            searchQuery={trimmedSearch}
            onClearSearch={() => updateSearchQuery("")}
          />
        ) : view === "table" ? (
          <JobTrackerTable
            jobs={filteredJobs}
            onSelectJob={setSelectedJob}
          />
        ) : (
          <JobTrackerCardList
            jobs={filteredJobs}
            onSelectJob={setSelectedJob}
          />
        )}
      </section>

      <JobApplicationEditorSheet
        job={selectedJob}
        open={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
        onSaved={handleJobSaved}
        onArchive={handleArchive}
        onDelete={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
