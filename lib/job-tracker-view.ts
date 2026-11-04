export type JobTrackerView = "cards" | "table";

export const JOB_TRACKER_VIEW_STORAGE_KEY = "planlet-job-tracker-view";

export function isJobTrackerView(value: string | null): value is JobTrackerView {
  return value === "cards" || value === "table";
}

export function readStoredJobTrackerView(): JobTrackerView | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = localStorage.getItem(JOB_TRACKER_VIEW_STORAGE_KEY);
    return isJobTrackerView(value) ? value : null;
  } catch { return null; }
}

export function storeJobTrackerView(view: JobTrackerView): void {
  if (typeof window === "undefined") {
    return;
  }

  try {localStorage.setItem(JOB_TRACKER_VIEW_STORAGE_KEY, view);} catch {}
}
