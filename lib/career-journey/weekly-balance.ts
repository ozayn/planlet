import type { CareerPracticeType } from "@/app/generated/prisma/client";

import { PRACTICE_TYPE_TO_PILLAR_NAME } from "@/lib/career-journey/constants";
import type { SerializedCareerSession } from "@/lib/career-journey/career-journey";

export const WEEKLY_BALANCE_PILLARS = [
  "Applications",
  "Networking",
  "Technical prep",
  "Learning",
  "Portfolio/projects",
  "Recovery/reflection",
] as const;

export type WeeklyBalanceItem = {
  name: (typeof WEEKLY_BALANCE_PILLARS)[number];
  count: number;
  barRatio: number;
};

function pillarForSession(type: CareerPracticeType): string {
  return PRACTICE_TYPE_TO_PILLAR_NAME[type];
}

export function computeWeeklyBalance(
  weekSessions: SerializedCareerSession[],
): WeeklyBalanceItem[] {
  const counts = new Map<string, number>();

  for (const name of WEEKLY_BALANCE_PILLARS) {
    counts.set(name, 0);
  }

  for (const session of weekSessions) {
    if (session.status !== "DONE" && session.status !== "PLANNED") continue;
    const pillar = pillarForSession(session.type);
    counts.set(pillar, (counts.get(pillar) ?? 0) + 1);
  }

  const items: WeeklyBalanceItem[] = WEEKLY_BALANCE_PILLARS.map((name) => ({
    name,
    count: counts.get(name) ?? 0,
    barRatio: 0,
  }));

  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return items.map((item) => ({
    ...item,
    barRatio: item.count / maxCount,
  }));
}

export function isWeeklyReviewWindow(todayDate: string): boolean {
  const day = new Date(`${todayDate}T12:00:00`).getDay();
  // Friday (5), Saturday (6), Sunday (0)
  return day === 0 || day === 5 || day === 6;
}
