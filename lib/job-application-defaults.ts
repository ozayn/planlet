import { format } from "date-fns";

export function defaultJobTitle(now = new Date()): string {
  return `Job application — ${format(now, "MMM d, yyyy")}`;
}

export function defaultJobCompany(): string {
  return "";
}

export function formatDuplicateJobSavedDate(savedAt: Date): string {
  return format(savedAt, "MMMM d, yyyy");
}
