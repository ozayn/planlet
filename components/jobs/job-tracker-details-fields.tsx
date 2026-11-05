"use client";
import { vettingRequirements } from "@/lib/job-vetting";
import { credibilityStatuses } from "@/lib/job-credibility";
import { employerSizeBands, employerSizeDescriptions, employerSizeEntities } from "@/lib/job-employer-size";
import { JobMissionFields } from "./job-mission-fields";
import type { TrackerDetails } from "@/lib/job-tracker-details";
const groups = [
  {label:"Credibility check",fields:[
    ["credibilityCheck","Review status",...credibilityStatuses],
    ["credibilityEvidence","Evidence: employer, exact listing / application destination, and recruiter identity"],
    ["credibilitySources","Source links (one per line)"],
    ["credibilityCheckedDate","Checked date"],
  ]},
  {label:"Employer size",fields:[
    ["employerSizeBand","Employee count band",...employerSizeBands],
    ["employerSizeEntity","Counted organization",...employerSizeEntities],
    ["employerSizeEntityName","Organization name (actual employer, agency, or parent)"],
    ["employerSizeSource","Size source URL"],
    ["employerSizeCheckedDate","Size checked date"],
  ]},
  {label: "Opportunity review", fields: [
    ["searchDecision", "My decision (separate from employer outcome)", "", "Pursue", "On hold", "Not pursuing"],
    ["decisionReason", "My decision reason"],
    ["locationEligibility", "DC / suitable US remote", "", "Met", "Not met", "Unknown"],
    ["locationEvidence", "Location evidence and source (including remote restrictions)"],
    ["vettingRequirement", "Clearance / vetting requirement",...vettingRequirements],
    ["vettingLevel", "Level, if stated"],
    ["vettingEvidence", "Vetting source note (Public Trust is not a security clearance)"],
    ["vettingSource", "Vetting source URL"],
    ["interestTier", "Interest tier override (blank uses recorded missions)", "", "Preferred", "Adjacent", "Other recorded missions", "Excluded", "Unknown / review needed"],
    ["interestReason", "Why this work matters to me"],
    ["candidateEvidence", "Strongest relevant experience / project evidence"],
    ["candidateEvidenceSource", "Experience evidence link"],
    ["materialGap", "Material gap / uncertainty (interest does not establish qualifications)"],
    ["gapSource", "Gap evidence link"],
  ]},
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
      ["responseStage", "Recorded response", "", "Response received", "Interview invited", "Interview scheduled", "Interview completed"],
      ["responseEvidence", "Response evidence (invitation is not a scheduled interview)"],
      ["responseSource", "Response source link"],
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
      ["recruitmentChannel", "Recruitment channel", "", "Direct employer", "Recruiting / staffing agency", "Referral", "Unknown"],
      ["recruitmentAgency", "Recruiting agency name (if applicable)"],
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
          {group.label==="Credibility check"&&<p className="mt-2 text-xs text-muted">A real employer can be impersonated. Review the specific destination and recruiter too; an ATS or LinkedIn receipt alone does not establish authenticity.</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {group.fields.map(([key, label, ...options]) => {
              const field = key as keyof TrackerDetails;
              return (
                <label key={key} className="block space-y-1 text-xs text-muted">
                  <span>{label}</span>
                  {["qualificationGaps","credibilityEvidence","credibilitySources"].includes(key) ? (
                    <textarea
                      disabled={disabled}
                      rows={3}
                      value={String(value[field] ?? "")}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          [key]: e.target.value,
                        })
                      }
                      placeholder={key==="qualificationGaps"?"One gap per line; note required or preferred if known":undefined}
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
                          {key==="employerSizeBand"?`${o} · ${employerSizeDescriptions[o]}`:o || "Unknown / not set"}
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
                        key === "deadline" || key === "dueDate" || key === "employerSizeCheckedDate" || key === "credibilityCheckedDate"
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
          {group.label === "Opportunity review" && (
            <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={value.civilianScopeConfirmed} disabled={disabled} onChange={e=>onChange({...value,civilianScopeConfirmed:e.target.checked})}/>Civilian assignment scope reviewed (record mission evidence)</label>
          )}
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
