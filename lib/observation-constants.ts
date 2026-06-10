import type { ObservationCategory } from "@/app/generated/prisma/client";

export const MAX_OBSERVATION_LENGTH = 2000;

export const OBSERVATION_CATEGORIES: readonly ObservationCategory[] = [
  "MIND",
  "EMOTION",
  "BODY",
  "CYCLE",
  "PAIN",
  "SKIN",
  "SLEEP",
  "ENERGY",
  "OTHER",
] as const;
