import type { SerializedJobApplication as Job } from "./job-applications";
export function localDate(now: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((k) => p.find((v) => v.type === k)!.value)
    .join("-");
}
export function weekStart(date: string) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function confirmed(j: Job) {
  return j.submissionConfirmed && !!j.submittedDate;
}
export function followUpDue(j: Job, today: string) {
  return (
    !!j.trackerDetails.nextAction &&
    !!j.trackerDetails.dueDate &&
    j.trackerDetails.dueDate <= today &&
    j.status !== "ARCHIVED"
  );
}
export function outcome(j: Job) {
  const status =
    j.status === "ARCHIVED"
      ? [...j.trackerHistory].reverse().find((e) => e.to !== "ARCHIVED")?.to
      : j.status;
  return (
    (
      {
        APPLIED: "Awaiting response",
        INTERVIEWING: "Interviewing",
        REJECTED: "Rejected",
        OFFER: "Offered",
        WITHDRAWN: "Withdrawn",
      } as Record<string, string>
    )[status ?? ""] ?? "Unclassified"
  );
}
export function roleCategory(j: Job) {
  if (j.trackerDetails.roleCategory) return j.trackerDetails.roleCategory;
  if (/data eng|analytics eng/i.test(j.title)) return "Data Engineering";
  if (/data scien|statistic/i.test(j.title)) return "Data Science";
  if (/\bai\b|genai|generative|\bllm\b|machine learning|\bml\b/i.test(j.title))
    return "Applied AI";
  if (/analyst|analytics|visualization/i.test(j.title)) return "Data Analytics";
  if (
    /software|developer|frontend|backend|full.?stack|programmer/i.test(j.title)
  )
    return "Software Engineering";
  return "Other";
}
export function sourceCategory(j: Job) {
  if (!j.source?.trim()) {
    try {
      const host = new URL(j.url ?? "").hostname.toLowerCase();
      for (const [domain, label] of [
        ["linkedin.com", "LinkedIn"],
        ["indeed.com", "Indeed"],
        ["ziprecruiter.com", "ZipRecruiter"],
      ]) {
        if (host === domain || host.endsWith("." + domain)) return label;
      }
    } catch {}
    return "Other";
  }
  const s = j.source.toLowerCase();
  const matches = [
    ["linkedin", "LinkedIn"],
    ["indeed", "Indeed"],
    ["ziprecruiter", "ZipRecruiter"],
    ["referr", "Referral"],
    ["employer", "Employer website"],
    ["company", "Employer website"],
  ]
    .map(([pattern, label]) => ({ index: s.indexOf(pattern), label }))
    .filter((match) => match.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (matches.length) return matches[0].label;
  return "Other";
}
export function insights(jobs: Job[], today: string) {
  const submissions = jobs.filter(confirmed);
  return {
    submissions,
    today: submissions.filter((j) => j.submittedDate === today),
    week: submissions.filter(
      (j) => j.submittedDate! >= weekStart(today) && j.submittedDate! <= today,
    ),
    month: submissions.filter(
      (j) =>
        j.submittedDate!.slice(0, 7) === today.slice(0, 7) &&
        j.submittedDate! <= today,
    ),
    awaiting: submissions.filter((j) => outcome(j) === "Awaiting response"),
    interviews: submissions.filter((j) => j.status === "INTERVIEWING"),
    offers: submissions.filter((j) => j.status === "OFFER"),
    followups: jobs.filter((j) => followUpDue(j, today)),
  };
}
export function groupJobs(jobs: Job[], key: (j: Job) => string) {
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const label = key(job);
    const entries = groups.get(label) ?? [];
    entries.push(job);
    groups.set(label, entries);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
