import type { ReactNode } from "react";

import type { SerializedJobApplication } from "@/app/(app)/jobs/actions";
import { ExternalLinkIcon } from "@/components/ui/action-icons";
import {
  formatJobTableAppliedDate,
  formatJobUpdatedLabel,
  getJobApplicationStatusLabel,
} from "@/lib/job-application-labels";

type JobTrackerTableProps = {
  jobs: SerializedJobApplication[];
  onSelectJob: (job: SerializedJobApplication) => void;
};

function TableCell({
  children,
  className = "",
  dir,
}: {
  children: ReactNode;
  className?: string;
  dir?: "auto" | "ltr" | "rtl";
}) {
  return (
    <td
      className={`px-3 py-2 align-middle text-sm ${className}`.trim()}
      dir={dir}
    >
      {children}
    </td>
  );
}

export function JobTrackerTable({ jobs, onSelectJob }: JobTrackerTableProps) {
  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    job: SerializedJobApplication,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectJob(job);
    }
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[52rem] text-sm" aria-label="Job applications">
        <caption className="sr-only">Job applications</caption>
        <thead>
          <tr className="border-b border-border-soft text-start text-xs text-muted-light">
            <th scope="col" className="px-3 py-2 font-medium">
              Company
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Title
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Applied date
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Location
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Source
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              URL
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              tabIndex={0}
              onClick={() => onSelectJob(job)}
              onKeyDown={(event) => handleRowKeyDown(event, job)}
              className="cursor-pointer border-b border-border-soft/70 transition-colors last:border-b-0 hover:bg-accent-cream/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
            >
              <TableCell className="max-w-[9rem] text-foreground" dir="auto">
                <span className="block truncate">{job.company}</span>
              </TableCell>
              <TableCell className="max-w-[10rem] text-foreground" dir="auto">
                <span className="block truncate">{job.title}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted">
                {getJobApplicationStatusLabel(job.status)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted">
                {formatJobTableAppliedDate(job.appliedDate)}
              </TableCell>
              <TableCell className="max-w-[8rem] text-muted" dir="auto">
                <span className="block truncate">
                  {job.location?.trim() || "—"}
                </span>
              </TableCell>
              <TableCell className="max-w-[8rem] text-muted" dir="auto">
                <span className="block truncate">
                  {job.source?.trim() || "—"}
                </span>
              </TableCell>
              <TableCell>
                {job.url ? (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                    aria-label="Open job posting"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="text-muted-light">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted">
                {formatJobUpdatedLabel(job.updatedAt)}
              </TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
