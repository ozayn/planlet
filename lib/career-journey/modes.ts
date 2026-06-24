import type { CareerPracticeMode } from "@/app/generated/prisma/client";

export type CareerPracticeModeMeta = {
  label: string;
  description: string;
  minutes: string;
};

export const CAREER_MODE_META: Record<CareerPracticeMode, CareerPracticeModeMeta> = {
  TINY: {
    label: "Tiny",
    description: "5 to 10 minutes",
    minutes: "5–10 min",
  },
  WARMUP: {
    label: "Warm-up",
    description: "About 15 minutes",
    minutes: "~15 min",
  },
  MODERATE: {
    label: "Moderate",
    description: "About 30 minutes",
    minutes: "~30 min",
  },
  DEEP: {
    label: "Deep",
    description: "About 60 minutes",
    minutes: "~60 min",
  },
};

export function formatCareerMode(mode: CareerPracticeMode): string {
  const meta = CAREER_MODE_META[mode];
  return `${meta.label} — ${meta.description}`;
}
