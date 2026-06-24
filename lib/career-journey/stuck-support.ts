import type { CareerPracticeType } from "@/app/generated/prisma/client";

import { PRACTICE_TYPE_TO_PILLAR_NAME } from "@/lib/career-journey/constants";
import type { SerializedCareerSession } from "@/lib/career-journey/career-journey";

const STUCK_THRESHOLD = 2;
const LOOKBACK_DAYS = 14;

export type StuckPattern = {
  type: CareerPracticeType;
  pillarName: string;
  label: string;
  skippedCount: number;
  movedCount: number;
  totalHard: number;
};

const TYPE_LABELS: Record<CareerPracticeType, string> = {
  LEETCODE: "LeetCode",
  ML_REVIEW: "ML/DS review",
  INTERVIEW_PREP: "Interview questions",
  COURSE: "Courses",
  SYSTEM_DESIGN: "System design",
  PROJECT: "Projects",
  NETWORKING: "Networking",
  APPLICATION: "Applications",
  RECOVERY: "Recovery",
};

export function findStuckPatterns(
  sessions: SerializedCareerSession[],
  todayDate: string,
): StuckPattern[] {
  const cutoff = new Date(`${todayDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const byType = new Map<
    CareerPracticeType,
    { skipped: number; moved: number }
  >();

  for (const session of sessions) {
    if (session.date < cutoffStr) continue;
    if (session.status !== "SKIPPED" && session.status !== "MOVED") continue;

    const current = byType.get(session.type) ?? { skipped: 0, moved: 0 };
    if (session.status === "SKIPPED") current.skipped += 1;
    if (session.status === "MOVED") current.moved += 1;
    byType.set(session.type, current);
  }

  const patterns: StuckPattern[] = [];

  for (const [type, counts] of byType) {
    const totalHard = counts.skipped + counts.moved;
    if (totalHard < STUCK_THRESHOLD) continue;

    patterns.push({
      type,
      pillarName: PRACTICE_TYPE_TO_PILLAR_NAME[type],
      label: TYPE_LABELS[type],
      skippedCount: counts.skipped,
      movedCount: counts.moved,
      totalHard,
    });
  }

  return patterns.sort((a, b) => b.totalHard - a.totalHard);
}

export function stuckSupportSmallerTitle(label: string): string {
  return `Tiny return to ${label.toLowerCase()} — read only, no pressure`;
}

export function stuckSupportReadTitle(label: string): string {
  return `Read about ${label.toLowerCase()} — no solving today`;
}

export function stuckSupportTenMinuteTitle(label: string): string {
  return `10-minute gentle ${label.toLowerCase()} — enough for today`;
}
