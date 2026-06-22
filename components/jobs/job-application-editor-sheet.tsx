"use client";

import { useEffect, useState, useTransition } from "react";

import {
  extractJobFromUrlAction,
  updateJobApplicationAction,
  type SerializedJobApplication,
} from "@/app/(app)/jobs/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { JOB_APPLICATION_STATUSES } from "@/lib/job-application-constants";
import { getJobApplicationStatusLabel } from "@/lib/job-application-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { JobApplicationStatus } from "@/app/generated/prisma/client";

type JobApplicationEditorSheetProps = {
  job: SerializedJobApplication | null;
  open: boolean;
  onClose: () => void;
  onSaved: (job: SerializedJobApplication) => void;
  onArchive: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  isPending?: boolean;
};

export function JobApplicationEditorSheet({
  job,
  open,
  onClose,
  onSaved,
  onArchive,
  onDelete,
  isPending = false,
}: JobApplicationEditorSheetProps) {
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    url: "",
    title: "",
    company: "",
    appliedDate: "",
    status: "APPLIED" as JobApplicationStatus,
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
    setFetchMessage(null);
  }, [job]);

  if (!job) {
    return null;
  }

  const jobId = job.id;
  const pending = isPending || isSaving;

  function handleSave() {
    if (pending) {
      return;
    }

    setError(null);
    setDuplicateWarning(false);

    startTransition(async () => {
      const result = await updateJobApplicationAction({
        jobId,
        data: form,
      });

      if (!result.success) {
        setError(result.error);
        setDuplicateWarning(Boolean(result.duplicate));
        return;
      }

      onSaved(result.job);
    });
  }

  function handleFetchDetails() {
    const url = form.url.trim();
    if (!url || pending) {
      return;
    }

    setFetchMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await extractJobFromUrlAction(url);
      if (!result.success) {
        setFetchMessage(result.error);
        return;
      }

      setForm((current) => ({
        ...current,
        title: result.details.title?.trim() || current.title,
        company: result.details.company?.trim() || current.company,
        location: result.details.location?.trim() || current.location,
        salary: result.details.salary?.trim() || current.salary,
        description: result.details.description?.trim() || current.description,
        summary: result.details.summary?.trim() || current.summary,
      }));
      setFetchMessage("Details filled in. Review before saving.");
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title={`${job.company} — ${job.title}`}
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
      <div className="space-y-3 overflow-y-auto px-5 py-4">
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">URL</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 flex-1 px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
            <button
              type="button"
              disabled={pending || !form.url.trim()}
              onClick={handleFetchDetails}
              className="ui-btn-secondary min-h-10 px-3 text-sm"
            >
              Fetch details
            </button>
          </div>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Company</span>
            <input
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
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Applied date</span>
            <input
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
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as JobApplicationStatus,
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
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Source</span>
            <input
              type="text"
              value={form.source}
              onChange={(event) => setForm({ ...form, source: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Referrer</span>
            <input
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
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Location</span>
            <input
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
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Salary</span>
            <input
              type="text"
              value={form.salary}
              onChange={(event) => setForm({ ...form, salary: event.target.value })}
              disabled={pending}
              className="ui-input min-h-10 w-full px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">Summary</span>
          <textarea
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            disabled={pending}
            rows={2}
            className="ui-input w-full px-3 py-2 text-sm"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">Description</span>
          <textarea
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

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            disabled={pending}
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
        {fetchMessage ? (
          <p className="text-sm text-muted" role="status">
            {fetchMessage}
          </p>
        ) : null}
      </div>
    </SimpleSheet>
  );
}
