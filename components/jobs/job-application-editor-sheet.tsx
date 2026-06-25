"use client";

import { useEffect, useState, useTransition } from "react";

import {
  updateJobApplicationAction,
  type SerializedJobApplication,
} from "@/app/(app)/jobs/actions";
import { JobUrlExtractControls } from "@/components/jobs/job-url-extract-controls";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { JOB_APPLICATION_STATUSES } from "@/lib/job-application-constants";
import { applyExtractedJobToEditForm } from "@/lib/apply-extracted-job-details";
import { getJobApplicationStatusLabel } from "@/lib/job-application-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { JobApplicationStatusValue } from "@/lib/job-application-status";

type JobApplicationEditorSheetProps = {
  job: SerializedJobApplication | null;
  open: boolean;
  onClose: () => void;
  onSaved: (job: SerializedJobApplication) => void;
  onArchive: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  isPending?: boolean;
  jobs?: SerializedJobApplication[];
  onOpenJob?: (job: SerializedJobApplication) => void;
};

export function JobApplicationEditorSheet({
  job,
  open,
  onClose,
  onSaved,
  onArchive,
  onDelete,
  isPending = false,
  jobs = [],
  onOpenJob,
}: JobApplicationEditorSheetProps) {
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);
  const [form, setForm] = useState({
    url: "",
    title: "",
    company: "",
    appliedDate: "",
    status: "APPLIED" as JobApplicationStatusValue,
    notes: "",
    source: "",
    referrer: "",
    location: "",
    salary: "",
    description: "",
    summary: "",
  });

  useEffect(() => {
    if (!job) {
      return;
    }

    setForm({
      url: job.url ?? "",
      title: job.title,
      company: job.company,
      appliedDate: job.appliedDate ?? "",
      status: job.status,
      notes: job.notes ?? "",
      source: job.source ?? "",
      referrer: job.referrer ?? "",
      location: job.location ?? "",
      salary: job.salary ?? "",
      description: job.description ?? "",
      summary: job.summary ?? "",
    });
    setError(null);
    setDuplicateWarning(false);
    setDuplicateJobId(null);
  }, [job]);

  if (!job) {
    return null;
  }

  const jobId = job.id;
  const fieldId = (name: string) => `job-edit-${jobId}-${name}`;
  const pending = isPending || isSaving;

  function handleSave() {
    if (pending) {
      return;
    }

    setError(null);
    setDuplicateWarning(false);
    setDuplicateJobId(null);

    startTransition(async () => {
      const result = await updateJobApplicationAction({
        jobId,
        data: form,
      });

      if (!result.success) {
        setError(result.error);
        setDuplicateWarning(Boolean(result.duplicate));
        setDuplicateJobId(result.duplicateJobId ?? null);
        return;
      }

      onSaved(result.job);
    });
  }

  function openDuplicateJob(existingJobId: string) {
    const existing = jobs.find((entry) => entry.id === existingJobId);
    if (existing && onOpenJob) {
      onOpenJob(existing);
      setError(null);
      setDuplicateWarning(false);
      setDuplicateJobId(null);
    }
  }

  const sheetTitle =
    job.company.trim() && job.title.trim()
      ? `${job.company} — ${job.title}`
      : job.title.trim() || job.company.trim() || "Job application";

  function handleExtracted(
    details: Parameters<typeof applyExtractedJobToEditForm>[1],
    canonicalUrl?: string,
  ) {
    setForm((current) => {
      const next = applyExtractedJobToEditForm(current, details);
      return canonicalUrl ? { ...next, url: canonicalUrl } : next;
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="ui-btn-primary min-h-10 px-4 text-sm"
          >
            Save changes
          </button>
          {job.status !== "ARCHIVED" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onArchive(job.id)}
              className="ui-btn-secondary min-h-10 px-4 text-sm"
            >
              Archive
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => onDelete(job.id)}
            className="ui-text-link min-h-10 px-2 text-sm text-accent-red"
          >
            Delete
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          You can save a job now and complete the details later.
        </p>

        <label className="block space-y-1.5" htmlFor={fieldId("url")}>
          <span className="text-xs text-muted">URL</span>
          <JobUrlExtractControls
            url={form.url}
            onUrlChange={(nextUrl) => setForm({ ...form, url: nextUrl })}
            onExtracted={handleExtracted}
            disabled={pending}
            urlInputId={fieldId("url")}
            urlInputName={fieldId("url")}
            pasteInputId={fieldId("paste")}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5" htmlFor={fieldId("title")}>
            <span className="text-xs text-muted">Title</span>
            <input
              id={fieldId("title")}
              name={fieldId("title")}
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <label className="block space-y-1.5" htmlFor={fieldId("company")}>
            <span className="text-xs text-muted">Company</span>
            <input
              id={fieldId("company")}
              name={fieldId("company")}
              type="text"
              value={form.company}
              onChange={(event) =>
                setForm({ ...form, company: event.target.value })
              }
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5" htmlFor={fieldId("applied-date")}>
            <span className="text-xs text-muted">Applied date</span>
            <input
              id={fieldId("applied-date")}
              name={fieldId("applied-date")}
              type="date"
              value={form.appliedDate}
              onChange={(event) =>
                setForm({ ...form, appliedDate: event.target.value })
              }
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <label className="block space-y-1.5" htmlFor={fieldId("status")}>
            <span className="text-xs text-muted">Status</span>
            <select
              id={fieldId("status")}
              name={fieldId("status")}
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as JobApplicationStatusValue,
                })
              }
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            >
              {JOB_APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getJobApplicationStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5" htmlFor={fieldId("source")}>
            <span className="text-xs text-muted">Source</span>
            <input
              id={fieldId("source")}
              name={fieldId("source")}
              type="text"
              value={form.source}
              onChange={(event) => setForm({ ...form, source: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <label className="block space-y-1.5" htmlFor={fieldId("referrer")}>
            <span className="text-xs text-muted">Referrer</span>
            <input
              id={fieldId("referrer")}
              name={fieldId("referrer")}
              type="text"
              value={form.referrer}
              onChange={(event) =>
                setForm({ ...form, referrer: event.target.value })
              }
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5" htmlFor={fieldId("location")}>
            <span className="text-xs text-muted">Location</span>
            <input
              id={fieldId("location")}
              name={fieldId("location")}
              type="text"
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <label className="block space-y-1.5" htmlFor={fieldId("salary")}>
            <span className="text-xs text-muted">Salary</span>
            <input
              id={fieldId("salary")}
              name={fieldId("salary")}
              type="text"
              value={form.salary}
              onChange={(event) => setForm({ ...form, salary: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <label className="block space-y-1.5" htmlFor={fieldId("summary")}>
          <span className="text-xs text-muted">Summary</span>
          <textarea
            id={fieldId("summary")}
            name={fieldId("summary")}
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            disabled={pending}
            rows={2}
            className="ui-input w-full px-3 py-2 text-sm"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <label className="block space-y-1.5" htmlFor={fieldId("description")}>
          <span className="text-xs text-muted">Description</span>
          <textarea
            id={fieldId("description")}
            name={fieldId("description")}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            disabled={pending}
            rows={4}
            className="ui-input w-full px-3 py-2 text-sm"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <label className="block space-y-1.5" htmlFor={fieldId("notes")}>
          <span className="text-xs text-muted">Notes</span>
          <textarea
            id={fieldId("notes")}
            name={fieldId("notes")}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            disabled={pending}
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
      </div>
    </SimpleSheet>
  );
}
