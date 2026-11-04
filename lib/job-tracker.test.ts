import { applicationDate, sortByApplicationDate } from "./job-tracker-sort";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTrackerDetails,
  trackerDetailsSchema,
  buildTrackerEvent,
  duplicateReason,
  needsAttention,
} from "./job-tracker-details";
import {
  localDate,
  weekStart,
  insights,
  groupJobs,
  outcome,
  roleCategory,
  sourceCategory,
} from "./job-tracker-insights";
import { emptyJobFilters, matchesJobFilters } from "./job-tracker-filters";
import type { SerializedJobApplication as Job } from "./job-applications";
function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "test",
    title: "Data Scientist",
    company: "Example",
    url: null,
    description: null,
    summary: null,
    source: null,
    referrer: null,
    location: null,
    salary: null,
    appliedDate: null,
    status: "SAVED",
    notes: null,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    trackerDetails: emptyTrackerDetails(),
    trackerHistory: [],
    submissionConfirmed: false,
    submittedDate: null,
    ...overrides,
  };
}
test("local dates honor timezone, midnight and DST", () => {
  assert.equal(
    localDate(new Date("2026-11-04T02:00:00Z"), "America/New_York"),
    "2026-11-03",
  );
  assert.equal(
    localDate(new Date("2026-11-01T05:30:00Z"), "America/New_York"),
    "2026-11-01",
  );
  assert.equal(
    localDate(new Date("2026-11-01T06:30:00Z"), "America/New_York"),
    "2026-11-01",
  );
  assert.equal(
    localDate(new Date("2026-11-04T02:00:00Z"), "Asia/Tokyo"),
    "2026-11-04",
  );
  assert.equal(weekStart("2026-11-01"), "2026-10-26");
});
test("drafts, blocked, failed and legacy dates do not count; rejection and withdrawal retain submissions", () => {
  const jobs = [
    job({ appliedDate: "2026-11-04" }),
    job({ status: "NEEDS_INPUT" }),
    job({ status: "SUBMISSION_FAILED" }),
    ...(["APPLIED", "REJECTED", "WITHDRAWN"] as const).map((status, i) =>
      job({
        id: String(i),
        status,
        submissionConfirmed: true,
        submittedDate: "2026-11-04",
      }),
    ),
  ];
  const data = insights(jobs, "2026-11-04");
  assert.equal(data.submissions.length, 3);
  assert.equal(data.today.length, 3);
  assert.equal(data.week.length, 3);
  assert.equal(data.awaiting.length, 1);
  assert.equal(
    insights(
      [job({ submissionConfirmed: true, submittedDate: "2026-11-01" })],
      "2026-11-04",
    ).week.length,
    0,
  );
});
test("submitted materials are copied rather than linked to the editable draft", () => {
  const details = {
    ...emptyTrackerDetails(),
    resumeVersion: "resume-v1",
    resumeLink: "https://example.com/v1.pdf",
    coverLetterVersion: "letter-v1",
  };
  const event = buildTrackerEvent(
    "READY_TO_SUBMIT",
    "APPLIED",
    details,
    true,
    "2026-11-04",
  );
  details.resumeVersion = "resume-v2";
  details.resumeLink = "https://example.com/v2.pdf";
  assert.equal(event.materials?.resumeVersion, "resume-v1");
  assert.equal(event.materials?.resumeLink, "https://example.com/v1.pdf");
});
test("unknown salary stays unknown and fails numeric salary filters", () => {
  const unknown = job();
  assert.equal(unknown.trackerDetails.salaryMin, "");
  assert.equal(
    matchesJobFilters(
      unknown,
      "EVERYTHING",
      "all",
      { ...emptyJobFilters(), salary: "1" },
      "2026-11-04",
    ),
    false,
  );
  assert.equal(
    trackerDetailsSchema.safeParse({
      ...emptyTrackerDetails(),
      salaryMin: "100",
      salaryMax: "50",
    }).success,
    false,
  );
  assert.equal(
    trackerDetailsSchema.safeParse({
      ...emptyTrackerDetails(),
      resumeLink: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    trackerDetailsSchema.safeParse({
      ...emptyTrackerDetails(),
      dueDate: "2026-02-30",
    }).success,
    false,
  );
});
test("duplicate warnings distinguish URL, employer ID and possible title matches", () => {
  const a = job({ url: "https://example.com/job" });
  assert.equal(duplicateReason(a, a), "Matching URL");
  const b = job({
    trackerDetails: { ...emptyTrackerDetails(), employerJobId: "123" },
  });
  assert.equal(duplicateReason(b, b), "Matching employer/job ID");
  assert.equal(
    duplicateReason(job(), job({ company: "EXAMPLE" })),
    "Possible company/title match",
  );
  assert.equal(
    duplicateReason(
      b,
      job({
        title: "Different role",
        trackerDetails: { ...emptyTrackerDetails(), employerJobId: "456" },
      }),
    ),
    null,
  );
});
test("attention, followup, applied today and inclusive date filters select matching records", () => {
  const blocked = job({ status: "NEEDS_INPUT" });
  assert.equal(needsAttention(blocked), true);
  assert.equal(
    matchesJobFilters(
      blocked,
      "EVERYTHING",
      "attention",
      emptyJobFilters(),
      "2026-11-04",
    ),
    true,
  );
  const submitted = job({
    status: "REJECTED",
    submissionConfirmed: true,
    submittedDate: "2026-11-04",
    trackerDetails: {
      ...emptyTrackerDetails(),
      nextAction: "Check in",
      dueDate: "2026-11-04",
      contactName: "Person",
      outreachStatus: "Identified",
    },
  });
  assert.equal(
    matchesJobFilters(
      submitted,
      "EVERYTHING",
      "followup",
      emptyJobFilters(),
      "2026-11-04",
    ),
    true,
  );
  assert.equal(
    matchesJobFilters(
      submitted,
      "EVERYTHING",
      "today",
      { ...emptyJobFilters(), from: "2026-11-04", to: "2026-11-04" },
      "2026-11-04",
    ),
    true,
  );
  assert.equal(
    matchesJobFilters(
      submitted,
      "APPLIED",
      "all",
      emptyJobFilters(),
      "2026-11-04",
    ),
    false,
  );
  assert.equal(submitted.trackerDetails.outreachStatus, "Identified");
});
test("role overrides and source groupings are editable and do not mutate titles", () => {
  const original = job();
  assert.equal(roleCategory(original), "Data Science");
  assert.equal(
    roleCategory(
      job({
        trackerDetails: { ...emptyTrackerDetails(), roleCategory: "Research" },
      }),
    ),
    "Research",
  );
  assert.equal(original.title, "Data Scientist");
  for (const source of [
    "LinkedIn",
    "Indeed",
    "ZipRecruiter",
    "Employer website",
    "Referral",
    "Other",
  ])
    assert.equal(sourceCategory(job({ source })), source);
  assert.equal(groupJobs([original, original], roleCategory)[0][1].length, 2);
});
test("archiving preserves the previous recorded outcome without inventing a legacy outcome", () => {
  assert.equal(
    outcome(
      job({
        status: "ARCHIVED",
        trackerHistory: [
          { at: "now", from: "APPLIED", to: "REJECTED", kind: "status" },
          { at: "now", from: "REJECTED", to: "ARCHIVED", kind: "status" },
        ],
      }),
    ),
    "Rejected",
  );
  assert.equal(outcome(job({ status: "ARCHIVED" })), "Unclassified");
});

test("custom categories are safe for object prototype names", () => {
  const original = job({
    trackerDetails: { ...emptyTrackerDetails(), roleCategory: "__proto__" },
  });
  assert.equal(groupJobs([original], roleCategory)[0][0], "__proto__");
});

test("real tracker title and mixed-source shapes group predictably", () => {
  assert.equal(
    roleCategory(
      job({
        title: "Senior Python GenAI Engineer (Remote), FastAPI / MCP / Azure",
      }),
    ),
    "Applied AI",
  );
  assert.equal(
    roleCategory(
      job({ title: "Data Analyst (Healthcare Fraud), 176046 / 0000176265" }),
    ),
    "Data Analytics",
  );
  assert.equal(
    roleCategory(job({ title: "Research Software Engineer" })),
    "Software Engineering",
  );
  assert.equal(
    sourceCategory(
      job({ source: "ZipRecruiter / LinkedIn; employer Breezy verified" }),
    ),
    "ZipRecruiter",
  );
  assert.equal(
    sourceCategory(job({ source: "Indeed; employer posting verified" })),
    "Indeed",
  );
});

test("source URL fallback uses board hostnames, not incidental words in a path", () => {
  assert.equal(
    sourceCategory(job({ url: "https://www.linkedin.com/jobs/view/123" })),
    "LinkedIn",
  );
  assert.equal(
    sourceCategory(job({ url: "https://example.com/indeed-job" })),
    "Other",
  );
  assert.equal(
    sourceCategory(job({ url: "https://notlinkedin.com/jobs/123" })),
    "Other",
  );
});

test("qualification gaps can be filtered without becoming submission blockers", () => {
  const candidate = job({
    trackerDetails: {
      ...emptyTrackerDetails(),
      qualificationGaps: "AWS certificate (preferred)\nCausal inference",
    },
  });
  assert.equal(needsAttention(candidate), false);
  assert.equal(
    matchesJobFilters(
      candidate,
      "EVERYTHING",
      "all",
      { ...emptyJobFilters(), qualificationGap: "aws" },
      "2026-11-04",
    ),
    true,
  );
  assert.equal(
    matchesJobFilters(
      candidate,
      "EVERYTHING",
      "all",
      { ...emptyJobFilters(), qualificationGap: "PMP" },
      "2026-11-04",
    ),
    false,
  );
  assert.equal(trackerDetailsSchema.parse({}).qualificationGaps, "");
});

test("application-date sort uses confirmed or legacy dates, puts undated jobs last, and never mutates the list", () => {
  const undated = job({ id: "undated", updatedAt: "2026-11-05T00:00:00Z" });
  const older = job({ id: "older", appliedDate: "2026-11-02" });
  const latest = job({
    id: "latest",
    submissionConfirmed: true,
    submittedDate: "2026-11-04",
    appliedDate: "2026-01-01",
  });
  const jobs = [undated, older, latest];
  assert.deepEqual(
    sortByApplicationDate(jobs).map((j) => j.id),
    ["latest", "older", "undated"],
  );
  assert.deepEqual(
    sortByApplicationDate(jobs, "asc").map((j) => j.id),
    ["older", "latest", "undated"],
  );
  assert.deepEqual(
    jobs.map((j) => j.id),
    ["undated", "older", "latest"],
  );
  assert.equal(applicationDate(latest), "2026-11-04");
  assert.equal(older.submissionConfirmed, false);
});
