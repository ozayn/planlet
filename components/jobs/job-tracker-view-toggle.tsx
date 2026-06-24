import type { JobTrackerView } from "@/lib/job-tracker-view";

type JobTrackerViewToggleProps = {
  view: JobTrackerView;
  disabled?: boolean;
  onChange: (view: JobTrackerView) => void;
};

const VIEW_OPTIONS: Array<{ value: JobTrackerView; label: string }> = [
  { value: "cards", label: "Cards" },
  { value: "table", label: "Table" },
];

export function JobTrackerViewToggle({
  view,
  disabled = false,
  onChange,
}: JobTrackerViewToggleProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Job list view"
    >
      <span className="text-xs text-muted-light">View</span>
      <div className="inline-flex rounded-lg border border-border-soft p-0.5">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={view === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-8 rounded-md px-2.5 text-xs transition-colors ${
              view === option.value ? "ui-segment-active" : "ui-segment"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
