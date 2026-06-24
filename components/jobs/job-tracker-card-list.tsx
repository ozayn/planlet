import type { SerializedJobApplication } from "@/app/(app)/jobs/actions";
import { ExternalLinkIcon } from "@/components/ui/action-icons";
import { formatJobListMeta } from "@/lib/job-application-labels";

type JobTrackerCardListProps = {
  jobs: SerializedJobApplication[];
  onSelectJob: (job: SerializedJobApplication) => void;
};

export function JobTrackerCardList({ jobs, onSelectJob }: JobTrackerCardListProps) {
  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={job.id}>
          <button
            type="button"
            onClick={() => onSelectJob(job)}
            className="ui-card-padded w-full border border-border-soft text-start transition-colors hover:bg-accent-cream/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-foreground"
                  dir="auto"
                >
                  {job.company} — {job.title}
                </p>
                <p className="mt-1 text-xs text-muted-light">
                  {formatJobListMeta(job.appliedDate, job.status)}
                </p>
                {job.notes?.trim() ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted" dir="auto">
                    {job.notes.trim()}
                  </p>
                ) : null}
              </div>
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-accent-cream hover:text-foreground"
                  aria-label="Open job posting"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
