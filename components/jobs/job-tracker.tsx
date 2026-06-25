"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

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
import { JobTrackerTable } from "@/components/jobs/job-tracker-table";
import { JobTrackerViewToggle } from "@/components/jobs/job-tracker-view-toggle";
import {
  JOB_APPLICATION_FILTERS,
  JOB_APPLICATION_STATUSES,
  type JobApplicationFilter,
} from "@/lib/job-application-constants";
import { applyExtractedJobToAddForm } from "@/lib/apply-extracted-job-details";
import { getJobApplicationStatusLabel } from "@/lib/job-application-labels";
import { getTodayDateString } from "@/lib/dates";
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
  userTimezone: string;
};

type AddJobFormState = {
  url: string;
  title: string;
  company: string;
  description: string;
  appliedDate: string;
  status: JobApplicationStatusValue;
  notes: string;
};

const emptyForm = (userTimezone: string): AddJobFormState => ({
  url: "",
  title: "",
  company: "",
  description: "",
  appliedDate: getTodayDateString(userTimezone),
  status: "SAVED",
  notes: "",
});

export function JobTracker({ initialJobs, userTimezone }: JobTrackerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState(initialJobs);
  const [filter, setFilter] = useState<JobApplicationFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q")?.trim() ?? "",
  );
  const [form, setForm] = useState<AddJobFormState>(() => emptyForm(userTimezone));
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);
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

    clearFormErrors();

    startTransition(async () => {
      const result = await createJobApplicationAction({
        url: form.url,
        title: form.title,
        company: form.company,
        description: form.description,
        appliedDate: form.appliedDate.trim() || null,
        status: form.status,
        notes: form.notes,
      });

      if (!result.success) {
        setError(result.error);
        setDuplicateWarning(Boolean(result.duplicate));
        setDuplicateJobId(result.duplicateJobId ?? null);
        return;
      }

      setForm(emptyForm(userTimezone));
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
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-foreground">Add job</h2>
          <p className="text-xs text-muted">
            You can save a job now and complete the details later.
          </p>
        </div>
        <form className="space-y-3" onSubmit={handleAddJob}>
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

          <label className="block space-y-1.5" htmlFor="job-add-description">
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
        jobs={jobs}
        onOpenJob={(job) => {
          setSelectedJob(job);
          clearFormErrors();
        }}
      />
    </div>
  );
}
