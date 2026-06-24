type JobTrackerEmptyStateProps = {
  hasJobs: boolean;
  searchQuery: string;
  onClearSearch: () => void;
};

export function JobTrackerEmptyState({
  hasJobs,
  searchQuery,
  onClearSearch,
}: JobTrackerEmptyStateProps) {
  if (!hasJobs) {
    return (
      <div className="ui-empty-state">
        <p className="text-sm text-muted">No jobs in this view yet.</p>
      </div>
    );
  }

  return (
    <div className="ui-empty-state space-y-2">
      <p className="text-sm text-muted">
        No jobs match &ldquo;{searchQuery}&rdquo;.
      </p>
      <button
        type="button"
        onClick={onClearSearch}
        className="ui-text-link text-sm"
      >
        Clear search
      </button>
    </div>
  );
}
