"use client";
import { JobMissionFields } from "./job-mission-fields";
import type { TrackerDetails } from "@/lib/job-tracker-details";
const groups = [
  {
    label: "Workflow and blockers",
    fields: [
      [
        "blockerType",
        "Blocker",
        "",
        "Missing answer",
        "Missing document",
        "Technical issue",
        "Other",
      ],
      ["blockerNote", "Missing answer or blocker note"],
    ],
  },
  {
    label: "Job and salary details",
    fields: [
      ["salaryMin", "Published salary minimum"],
      ["salaryMax", "Published salary maximum"],
      ["currency", "Currency (ISO code, e.g. USD)"],
      ["payPeriod", "Pay period", "", "Hour", "Day", "Week", "Month", "Year"],
      ["requestedSalary", "Requested salary (same currency and period)"],
      [
        "employmentType",
        "Employment type",
        "",
        "Full-time",
        "Part-time",
        "Contract",
        "Temporary",
        "Internship",
      ],
      [
        "workArrangement",
        "Work arrangement",
        "",
        "Remote",
        "Hybrid",
        "On-site",
      ],
      ["officeDays", "Required office days per week"],
      ["deadline", "Deadline"],
      ["employerJobId", "Original employer/job ID"],
      ["roleCategory", "Role category"],
      ["qualificationGaps", "Missing qualifications (skills or certificates)"],
    ],
  },
  {
    label: "Application materials",
    fields: [
      ["resumeVersion", "Exact resume version"],
      ["resumeLink", "Resume file link"],
      ["coverLetterVersion", "Exact cover letter version"],
      ["coverLetterLink", "Cover letter file link"],
    ],
  },
  {
    label: "Next action and outreach",
    fields: [
      ["nextAction", "Next action"],
      ["dueDate", "Due date"],
      ["contactName", "Contact name"],
      ["linkedInUrl", "Contact LinkedIn URL"],
      [
        "outreachStatus",
        "Outreach status",
        "",
        "Identified",
        "Planned",
        "Contacted",
        "Replied",
      ],
    ],
  },
];
export function JobTrackerDetailsFields({
  value,
  onChange,
  disabled,
}: {
  value: TrackerDetails;
  onChange: (v: TrackerDetails) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <JobMissionFields value={value} onChange={onChange} disabled={disabled} />
      <datalist id="job-role-categories">
        {[
          "Data Science",
          "Applied AI",
          "Machine Learning Engineering",
          "Software Engineering",
          "Data Engineering",
          "Data Analytics",
          "Other",
        ].map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
      {groups.map((group) => (
        <details
          key={group.label}
          className="rounded-lg border border-border-soft p-3"
        >
          <summary className="cursor-pointer text-sm font-medium">
            {group.label}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {group.fields.map(([key, label, ...options]) => {
              const field = key as keyof TrackerDetails;
              return (
                <label key={key} className="block space-y-1 text-xs text-muted">
                  <span>{label}</span>
                  {key === "qualificationGaps" ? (
                    <textarea
                      disabled={disabled}
                      rows={3}
                      value={value.qualificationGaps ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          qualificationGaps: e.target.value,
                        })
                      }
                      placeholder="One gap per line; note required or preferred if known"
                      className="ui-input w-full px-3 py-2"
                    />
                  ) : options.length ? (
                    <select
                      disabled={disabled}
                      value={String(value[field] ?? "")}
                      onChange={(e) =>
                        onChange({ ...value, [key]: e.target.value })
                      }
                      className="ui-input min-h-10 w-full px-3"
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o || "Unknown / not set"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      list={
                        key === "roleCategory"
                          ? "job-role-categories"
                          : undefined
                      }
                      disabled={disabled}
                      type={
                        key === "deadline" || key === "dueDate"
                          ? "date"
                          : "text"
                      }
                      value={String(value[field] ?? "")}
                      onChange={(e) =>
                        onChange({ ...value, [key]: e.target.value })
                      }
                      className="ui-input min-h-10 w-full px-3"
                    />
                  )}
                </label>
              );
            })}
          </div>
          {group.label === "Application materials" && (
            <label className="mt-3 flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.materialsNeedReview}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...value, materialsNeedReview: e.target.checked })
                }
              />
              Submitted materials need review or correction
            </label>
          )}
        </details>
      ))}
    </div>
  );
}
