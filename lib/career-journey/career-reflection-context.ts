import type { UserAccess } from "@/lib/roles";

import { getCareerJourneyPageData } from "@/lib/career-journey/career-journey";
import { getCareerJobSummary } from "@/lib/career-journey/job-summary";
import { PRACTICE_STATUS_LABELS } from "@/lib/career-journey/constants";
import { getMonthlyInsights } from "@/lib/insights";

export async function buildCareerReflectionContext(
  userId: string,
  access: UserAccess,
): Promise<string> {
  const [career, jobSummary, insights] = await Promise.all([
    getCareerJourneyPageData(userId),
    getCareerJobSummary(userId, access),
    getMonthlyInsights(userId, new Date(), access),
  ]);

  const lines: string[] = [
    `Target roles: ${career.profile.targetRoles.join(", ") || "none set"}`,
    `Current focus: ${career.profile.currentFocus ?? "none set"}`,
  ];

  if (career.pillars.length > 0) {
    lines.push(
      `Weekly pillars: ${career.pillars
        .filter((pillar) => pillar.isActive)
        .map(
          (pillar) =>
            `${pillar.name} ${pillar.doneThisWeek}/${pillar.weeklyTarget}`,
        )
        .join("; ")}`,
    );
  }

  const weekStatusCounts = career.weekSessions.reduce<Record<string, number>>(
    (counts, session) => {
      const label = PRACTICE_STATUS_LABELS[session.status];
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    },
    {},
  );

  if (Object.keys(weekStatusCounts).length > 0) {
    lines.push(
      `Practice sessions this week: ${Object.entries(weekStatusCounts)
        .map(([status, count]) => `${status} ${count}`)
        .join(", ")}`,
    );
  }

  const recentSessions = career.weekSessions.slice(0, 8);
  if (recentSessions.length > 0) {
    lines.push(
      `Recent sessions: ${recentSessions
        .map((session) => `${session.title} (${session.status})`)
        .join("; ")}`,
    );
  }

  if (jobSummary) {
    lines.push(
      `Job tracker: ${jobSummary.applicationsThisWeek} applications this week; saved ${jobSummary.saved}, applied ${jobSummary.applied}, interviewing ${jobSummary.interviewing}, rejected ${jobSummary.rejected}`,
    );
  }

  lines.push(
    `Planning activity this month: done ${insights.totals.done}, not done ${insights.totals.notDone}, moved ${insights.totals.moved}, open ${insights.totals.open}`,
  );

  return lines.join("\n");
}
